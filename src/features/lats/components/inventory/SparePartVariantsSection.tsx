import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, Package, Move, Check, Minus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SparePartVariant } from '../../types/spareParts';
import ChildrenVariantsTracker from '../shared/ChildrenVariantsTracker';
import { adjustChildrenVariantsForStock, validateChildrenVariants, formatPrice, checkDuplicateVariantName } from '../../lib/childrenVariantsUtils';

interface SparePartVariantsSectionProps {
  variants: SparePartVariant[];
  setVariants: React.Dispatch<React.SetStateAction<SparePartVariant[]>>;
  useVariants: boolean;
  setUseVariants: (enabled: boolean) => void;
  showVariants: boolean;
  setShowVariants: React.Dispatch<React.SetStateAction<boolean>>;
  isReorderingVariants: boolean;
  setIsReorderingVariants: React.Dispatch<React.SetStateAction<boolean>>;
  draggedVariantIndex: number | null;
  setDraggedVariantIndex: React.Dispatch<React.SetStateAction<number | null>>;
  basePartNumber: string;
  mainProductImages?: any[];
  // deviceDatabase removed - compatible devices moved to main spare part level
}

// Extended interface to include children variants support
interface ExtendedSparePartVariant extends SparePartVariant {
  childrenVariants?: string[]; // Part numbers for child variants (optional)
  useChildrenVariants?: boolean; // Toggle to enable/disable children variants
}

const SparePartVariantsSection: React.FC<SparePartVariantsSectionProps> = ({
  variants,
  setVariants,
  useVariants,
  setUseVariants,
  showVariants,
  setShowVariants,
  isReorderingVariants,
  setIsReorderingVariants,
  draggedVariantIndex,
  setDraggedVariantIndex,
  basePartNumber,
  mainProductImages,
  deviceDatabase = []
}) => {
  const [expandedVariantIndex, setExpandedVariantIndex] = useState<number | null>(null);
  const [showHelpTooltip, setShowHelpTooltip] = useState<number | null>(null);

  // Device management removed - compatible devices moved to main spare part level

  // Convert variants to extended format with children variants support (compatible_devices removed - now at main spare part level)
  const extendedVariants: ExtendedSparePartVariant[] = variants.map(v => ({
    ...v,
    childrenVariants: (v as any).childrenVariants || [],
    useChildrenVariants: (v as any).useChildrenVariants || false
    // compatible_devices removed - now only at main spare part level
  }));

  // Compatible devices functionality removed - now only at main spare part level

  const addVariant = () => {
    // Enable variants and show variants section if not already enabled
    if (!useVariants) {
      setUseVariants(true);
    }
    if (!showVariants) {
      setShowVariants(true);
    }

    // Get the last variant to duplicate its specifications
    const lastVariant = extendedVariants.length > 0 ? extendedVariants[extendedVariants.length - 1] : null;

    // Generate a unique variant name
    let variantNumber = extendedVariants.length + 1;
    let variantName = `Variant ${variantNumber}`;
    
    // Check for duplicate names (case-insensitive)
    while (extendedVariants.some(v => v.name?.toLowerCase().trim() === variantName.toLowerCase().trim())) {
      variantNumber++;
      variantName = `Variant ${variantNumber}`;
    }

    const newVariant: ExtendedSparePartVariant = {
      name: variantName,
      sku: generateVariantSKU(extendedVariants.length + 1),
      cost_price: lastVariant?.cost_price || 0,
      selling_price: lastVariant?.selling_price || 0,
      quantity: 0,
      min_quantity: 2,
      // Duplicate the previous variant's attributes/specifications
      attributes: lastVariant?.attributes ? { ...lastVariant.attributes } : {},
      childrenVariants: [],
      useChildrenVariants: false,
      // compatible_devices removed - now only at main spare part level
    };
    
    const newIndex = extendedVariants.length;
    setVariants(prev => [...prev, newVariant as SparePartVariant]);
    
    // Auto-expand the newly added variant
    setExpandedVariantIndex(newIndex);
    
    toast.success(`Variant "${variantName}" added`);
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof ExtendedSparePartVariant, value: any) => {
    // When quantity changes, update childrenVariants to match
    if (field === 'quantity') {
      const currentVariant = extendedVariants[index];
      const newQuantity = value || 0;
      
      // If stock is set to 0, disable children variants
      if (newQuantity === 0 && currentVariant.useChildrenVariants) {
        setVariants(prev => prev.map((variant, i) => 
          i === index 
            ? { ...variant, [field]: value, ...({ childrenVariants: [], useChildrenVariants: false } as any) }
            : variant
        ));
        return;
      }
      
      // If tracking is enabled, automatically adjust fields to match stock quantity
      if (currentVariant.useChildrenVariants && newQuantity > 0) {
        const updatedChildren = adjustChildrenVariantsForStock(
          currentVariant.childrenVariants || [],
          newQuantity,
          currentVariant.useChildrenVariants
        );
        setVariants(prev => prev.map((variant, i) => 
          i === index 
            ? { ...variant, [field]: value, ...({ childrenVariants: updatedChildren } as any) }
            : variant
        ));
        return;
      }
    }
    
    // Check for duplicate variant names when updating the name field
    if (field === 'name' && value) {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        if (checkDuplicateVariantName(trimmedValue, extendedVariants, index)) {
          toast.error(`A variant with the name "${trimmedValue}" already exists in this spare part`);
          return;
        }
      }
    }
    
    // Check for duplicate children variants (Part numbers) when updating childrenVariants
    if (field === 'childrenVariants' && Array.isArray(value)) {
      const currentVariant = extendedVariants[index];
      const stockQuantity = currentVariant.quantity || 0;
      
      const validation = validateChildrenVariants(
        value,
        stockQuantity,
        currentVariant.useChildrenVariants || false,
        extendedVariants,
        index,
        'Part number'
      );
      
      if (!validation.isValid) {
        if (validation.adjustedValue) {
          setVariants(prev => prev.map((variant, i) => 
            i === index ? { ...variant, ...({ [field]: validation.adjustedValue } as any) } : variant
          ));
        }
        return;
      }
      
      value = validation.adjustedValue || value;
    }
    
    setVariants(prev => prev.map((variant, i) => 
      i === index ? { ...variant, [field]: value } : variant
    ));
  };

  const generateVariantSKU = (variantNumber: number) => {
    return `${basePartNumber}-V${variantNumber.toString().padStart(2, '0')}`;
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedVariantIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedVariantIndex === null || draggedVariantIndex === dropIndex) {
      return;
    }

    setVariants(prev => {
      const newVariants = [...prev];
      const draggedItem = newVariants[draggedVariantIndex];
      
      // Remove the dragged item
      newVariants.splice(draggedVariantIndex, 1);
      
      // Insert at new position
      newVariants.splice(dropIndex, 0, draggedItem);
      
      return newVariants;
    });
    
    setDraggedVariantIndex(null);
  };

  // Auto-expand first variant when variants are added
  useEffect(() => {
    setExpandedVariantIndex(current => {
      // If we have variants but no expanded variant, expand the first one
      if (extendedVariants.length > 0 && current === null) {
        return 0;
      }
      // If all variants are removed, reset expanded index
      if (extendedVariants.length === 0) {
        return null;
      }
      // If the currently expanded variant is removed, expand the first one (or null if none)
      if (current !== null && current >= extendedVariants.length) {
        return extendedVariants.length > 0 ? 0 : null;
      }
      // Otherwise, keep current state
      return current;
    });
  }, [extendedVariants.length]);

  // Close help tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showHelpTooltip !== null) {
        const target = event.target as Element;
        if (!target.closest('.help-tooltip-container')) {
          setShowHelpTooltip(null);
        }
      }
    };

    if (showHelpTooltip !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHelpTooltip]);


  return (
    <div className="mb-6">
        {/* Variants List - Always show when variants are enabled or when there are variants */}
        {(showVariants || useVariants || extendedVariants.length > 0) && (
        <div className="py-6 space-y-4">
            {extendedVariants.length === 0 ? (
              <div className="text-center py-8">
                <Layers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No variants added yet. Click "Add New Variant" to get started.</p>
              </div>
            ) : (
              extendedVariants.map((variant, index) => {
                const isExpanded = expandedVariantIndex === index;
                const isComplete = variant.name && variant.selling_price > 0;
                const profit = variant.selling_price - variant.cost_price;
                const isProfitable = profit > 0;

                return (
                  <div
                    key={index}
                    className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 ${
                      isExpanded 
                        ? 'border-blue-500 shadow-xl' 
                        : isComplete
                          ? 'border-green-200 hover:border-green-300 hover:shadow-md'
                          : 'border-orange-300 hover:border-orange-400 hover:shadow-md'
                    }`}
                    draggable={isReorderingVariants}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={() => setDraggedVariantIndex(null)}
                    style={{ cursor: isReorderingVariants ? 'grabbing' : 'default' }}
                  >
                    {/* Variant Header - Clickable */}
                    <div 
                      className="flex items-start justify-between p-6 cursor-pointer"
                      onClick={() => setExpandedVariantIndex(isExpanded ? null : index)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          {isReorderingVariants && (
                            <div className="w-6 h-6 flex items-center justify-center text-gray-400">
                              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 6h8v2H8V6zm0 5h8v2H8v-2zm0 5h8v2H8v-2z"/>
                              </svg>
                            </div>
                          )}
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                            isExpanded ? 'bg-blue-500' : 'bg-gray-200'
                          }`}>
                            <svg 
                              className={`w-4 h-4 text-white transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                              }`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-lg font-bold text-gray-900">
                                {variant.name || `Variant ${index + 1}`}
                              </h4>
                              {/* Status Badge */}
                              {isComplete ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Done
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-sm animate-pulse">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Pending
                                </span>
                              )}
                            </div>
                            {variant.selling_price > 0 && (
                              <p className="text-sm text-gray-600 mt-1">Price: {formatPrice(variant.selling_price)} TZS</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {/* Profit Badge */}
                        {isComplete && variant.cost_price > 0 && (
                          <div className={`px-4 py-2 rounded-xl text-base font-bold shadow-sm ${
                            isProfitable ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                          }`}>
                            {isProfitable ? `+${formatPrice(profit)} TZS` : 'Loss'}
                          </div>
                        )}
                        {!isReorderingVariants && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeVariant(index);
                            }}
                            disabled={extendedVariants.length === 1}
                            className={`p-2 rounded-xl transition-colors ${
                              extendedVariants.length === 1
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                            }`}
                            aria-label="Remove variant"
                            title={extendedVariants.length === 1 ? 'Cannot delete the last variant. At least one variant is required.' : 'Remove variant'}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Content - Only show when variant is expanded */}
                    {isExpanded && (
                      <div className="px-6 pb-6">
                        {/* Variant Name */}
                        <div className="mb-4">
                          <label className="block text-xs font-medium text-gray-700 mb-2">Variant Name *</label>
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) => updateVariant(index, 'name', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium"
                            placeholder="Enter variant name (e.g., 256GB - Space Black)"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                          />
                        </div>

                        {/* Pricing and Stock Fields */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {/* Cost Price */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Cost Price</label>
                            <input
                              type="text"
                              value={variant.cost_price ? formatPrice(variant.cost_price) : ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/,/g, '');
                                updateVariant(index, 'cost_price', parseFloat(value) || 0);
                              }}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900 text-lg font-bold"
                              placeholder="0"
                              min="0"
                            />
                          </div>

                          {/* Selling Price */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Selling Price *</label>
                            <input
                              type="text"
                              value={variant.selling_price ? formatPrice(variant.selling_price) : ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/,/g, '');
                                updateVariant(index, 'selling_price', parseFloat(value) || 0);
                              }}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-lg font-bold"
                              placeholder="0"
                              min="0"
                            />
                          </div>

                          {/* Stock Quantity */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Stock Qty</label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateVariant(index, 'quantity', Math.max(0, (variant.quantity || 0) - 1))}
                                className="w-14 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-xl transition-colors text-gray-700 font-bold"
                                aria-label="Decrease stock quantity"
                              >
                                <Minus className="w-5 h-5" />
                              </button>
                              <input
                                type="number"
                                value={variant.quantity || ''}
                                onChange={(e) => updateVariant(index, 'quantity', Math.max(0, parseInt(e.target.value) || 0))}
                                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-lg font-bold text-center"
                                placeholder="0"
                                min="0"
                              />
                              <button
                                type="button"
                                onClick={() => updateVariant(index, 'quantity', (variant.quantity || 0) + 1)}
                                className="w-14 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-xl transition-colors text-gray-700 font-bold"
                                aria-label="Increase stock quantity"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {/* Minimum Stock Level */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Min Stock</label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateVariant(index, 'min_quantity', Math.max(0, (variant.min_quantity || 0) - 1))}
                                className="w-14 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-xl transition-colors text-gray-700 font-bold"
                                aria-label="Decrease minimum stock level"
                              >
                                <Minus className="w-5 h-5" />
                              </button>
                              <input
                                type="number"
                                value={variant.min_quantity || ''}
                                onChange={(e) => updateVariant(index, 'min_quantity', Math.max(0, parseInt(e.target.value) || 0))}
                                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-lg font-bold text-center"
                                placeholder="0"
                                min="0"
                              />
                              <button
                                type="button"
                                onClick={() => updateVariant(index, 'min_quantity', (variant.min_quantity || 0) + 1)}
                                className="w-14 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-xl transition-colors text-gray-700 font-bold"
                                aria-label="Increase minimum stock level"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Children Variants Section - Optional */}
                        <ChildrenVariantsTracker
                          variant={variant}
                          variantIndex={index}
                          onUpdate={(field, value) => updateVariant(index, field, value)}
                          label="Part numbers"
                          itemLabel="Part number"
                          allVariants={extendedVariants}
                        />

                        {/* Compatible Devices Section Removed - Now only at main spare part level */}

                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Add Variant Button */}
      <div className="pt-0 pb-6">
          <button
            type="button"
            onClick={addVariant}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-green-600 font-semibold"
          >
            <Plus size={20} />
            Add New Variant
          </button>
      </div>
    </div>
  );
};

export default SparePartVariantsSection;
