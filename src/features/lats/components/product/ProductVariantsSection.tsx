import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, Package, Move, Check, DollarSign, Minus, Hash } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { specificationCategories, getSpecificationsByCategory } from '../../../../data/specificationCategories';
import ChildrenVariantsTracker from '../shared/ChildrenVariantsTracker';
import { adjustChildrenVariantsForStock, validateChildrenVariants, formatPrice, checkDuplicateVariantName } from '../../lib/childrenVariantsUtils';

interface ProductVariant {
  name: string;
  sku: string;
  costPrice: number;
  price: number;
  stockQuantity: number;
  minStockLevel: number;
  attributes?: Record<string, any>;
  childrenVariants?: string[]; // IMEI/Serial numbers for child variants (optional)
  useChildrenVariants?: boolean; // Toggle to enable/disable children variants
}

interface ProductVariantsSectionProps {
  variants: ProductVariant[];
  setVariants: React.Dispatch<React.SetStateAction<ProductVariant[]>>;
  useVariants: boolean;
  setUseVariants: (enabled: boolean) => void;
  showVariants: boolean;
  setShowVariants: React.Dispatch<React.SetStateAction<boolean>>;
  isReorderingVariants: boolean;
  setIsReorderingVariants: React.Dispatch<React.SetStateAction<boolean>>;
  draggedVariantIndex: number | null;
  setDraggedVariantIndex: React.Dispatch<React.SetStateAction<number | null>>;
  onVariantSpecificationsClick: (index: number) => void;
  baseSku: string;
  selectedVariants?: Set<number>;
  setSelectedVariants?: React.Dispatch<React.SetStateAction<Set<number>>>;
  keyboardSelectionIndex?: number;
  setKeyboardSelectionIndex?: React.Dispatch<React.SetStateAction<number>>;
}

const ProductVariantsSection: React.FC<ProductVariantsSectionProps> = ({
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
  onVariantSpecificationsClick,
  baseSku,
  selectedVariants = new Set(),
  setSelectedVariants = () => {},
  keyboardSelectionIndex = -1,
  setKeyboardSelectionIndex = () => {}
}) => {
  const addVariant = () => {
    // Get the last variant to duplicate its specifications
    const lastVariant = variants.length > 0 ? variants[variants.length - 1] : null;

    // Generate a unique variant name
    let variantNumber = variants.length + 1;
    let variantName = `Variant ${variantNumber}`;
    
    // Check for duplicate names (case-insensitive)
    while (variants.some(v => v.name?.toLowerCase().trim() === variantName.toLowerCase().trim())) {
      variantNumber++;
      variantName = `Variant ${variantNumber}`;
    }

    const newVariant: ProductVariant = {
      name: variantName,
      sku: generateVariantSKU(variants.length + 1),
      costPrice: lastVariant?.costPrice || 0,
      price: lastVariant?.price || 0,
      stockQuantity: 0,
      minStockLevel: 2,
      // Duplicate the previous variant's attributes/specifications
      attributes: lastVariant?.attributes ? { ...lastVariant.attributes } : {},
      childrenVariants: [],
      useChildrenVariants: false
    };
    setVariants(prev => [...prev, newVariant]);
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    // When stockQuantity changes, update childrenVariants to match
    if (field === 'stockQuantity') {
      const currentVariant = variants[index];
      const newStockQuantity = value || 0;
      
      // If stock is set to 0, disable children variants
      if (newStockQuantity === 0 && currentVariant.useChildrenVariants) {
        setVariants(prev => prev.map((variant, i) => 
          i === index 
            ? { ...variant, [field]: value, childrenVariants: [], useChildrenVariants: false }
            : variant
        ));
        return;
      }
      
      // If tracking is enabled, automatically adjust fields to match stock quantity
      if (currentVariant.useChildrenVariants && newStockQuantity > 0) {
        const updatedChildren = adjustChildrenVariantsForStock(
          currentVariant.childrenVariants || [],
          newStockQuantity,
          currentVariant.useChildrenVariants
        );
        setVariants(prev => prev.map((variant, i) => 
          i === index 
            ? { ...variant, [field]: value, childrenVariants: updatedChildren }
            : variant
        ));
        return;
      }
    }
    
    // Check for duplicate variant names when updating the name field
    if (field === 'name' && value) {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        if (checkDuplicateVariantName(trimmedValue, variants, index)) {
          toast.error(`A variant with the name "${trimmedValue}" already exists in this product`);
          return;
        }
      }
    }
    
    // Check for duplicate children variants (IMEI/Serial numbers) when updating childrenVariants
    if (field === 'childrenVariants' && Array.isArray(value)) {
      const currentVariant = variants[index];
      const stockQuantity = currentVariant.stockQuantity || 0;
      
      const validation = validateChildrenVariants(
        value,
        stockQuantity,
        currentVariant.useChildrenVariants || false,
        variants,
        index,
        'IMEI/Serial number'
      );
      
      if (!validation.isValid) {
        if (validation.adjustedValue) {
          setVariants(prev => prev.map((variant, i) => 
            i === index ? { ...variant, [field]: validation.adjustedValue } : variant
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
    return `${baseSku}-V${variantNumber.toString().padStart(2, '0')}`;
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

  const formatSpecificationValue = (key: string, value: string) => {
    const lowerKey = key.toLowerCase();
    const lowerValue = value.toLowerCase();
    
    // Storage related
    if (lowerKey.includes('storage') || lowerKey.includes('capacity') || lowerKey.includes('disk')) {
      if (lowerValue.includes('gb') || lowerValue.includes('gigabyte')) {
        return value;
      }
      if (lowerValue.includes('tb') || lowerValue.includes('terabyte')) {
        return value;
      }
      if (lowerValue.includes('mb') || lowerValue.includes('megabyte')) {
        return value;
      }
      // If it's just a number, assume GB
      if (/^\d+$/.test(value)) {
        return `${value} GB`;
      }
    }
    
    // RAM/Memory related
    if (lowerKey.includes('ram') || lowerKey.includes('memory') || lowerKey.includes('ddr')) {
      if (lowerValue.includes('gb') || lowerValue.includes('gigabyte')) {
        return value;
      }
      if (lowerValue.includes('mb') || lowerValue.includes('megabyte')) {
        return value;
      }
      // If it's just a number, assume GB
      if (/^\d+$/.test(value)) {
        return `${value} GB`;
      }
    }
    
    // Screen/Display related
    if (lowerKey.includes('screen') || lowerKey.includes('display') || lowerKey.includes('monitor') || lowerKey.includes('size')) {
      if (lowerValue.includes('inch') || lowerValue.includes('"') || lowerValue.includes('in')) {
        return value;
      }
      // If it's just a number, assume inches
      if (/^\d+(\.\d+)?$/.test(value)) {
        return `${value}"`;
      }
    }
    
    // Weight related
    if (lowerKey.includes('weight') || lowerKey.includes('mass')) {
      if (lowerValue.includes('kg') || lowerValue.includes('kilogram')) {
        return value;
      }
      if (lowerValue.includes('g') || lowerValue.includes('gram')) {
        return value;
      }
      if (lowerValue.includes('lb') || lowerValue.includes('pound')) {
        return value;
      }
      // If it's just a number, assume kg
      if (/^\d+(\.\d+)?$/.test(value)) {
        return `${value} kg`;
      }
    }
    
    // Battery related
    if (lowerKey.includes('battery') || lowerKey.includes('mah')) {
      if (lowerValue.includes('mah') || lowerValue.includes('milliampere')) {
        return value;
      }
      if (lowerValue.includes('wh') || lowerValue.includes('watt')) {
        return value;
      }
      // If it's just a number, assume mAh
      if (/^\d+$/.test(value)) {
        return `${value} mAh`;
      }
    }
    
    // Processor/CPU related
    if (lowerKey.includes('processor') || lowerKey.includes('cpu') || lowerKey.includes('ghz')) {
      if (lowerValue.includes('ghz') || lowerValue.includes('gigahertz')) {
        return value;
      }
      if (lowerValue.includes('mhz') || lowerValue.includes('megahertz')) {
        return value;
      }
      // If it's just a number, assume GHz
      if (/^\d+(\.\d+)?$/.test(value)) {
        return `${value} GHz`;
      }
    }
    
    // Resolution related
    if (lowerKey.includes('resolution') || lowerKey.includes('pixel') || lowerKey.includes('hd')) {
      if (lowerValue.includes('p') || lowerValue.includes('pixel')) {
        return value;
      }
      if (lowerValue.includes('x') && /^\d+x\d+$/.test(value)) {
        return value;
      }
    }
    
    // Dimensions related
    if (lowerKey.includes('dimension') || lowerKey.includes('length') || lowerKey.includes('width') || lowerKey.includes('height')) {
      if (lowerValue.includes('cm') || lowerValue.includes('centimeter')) {
        return value;
      }
      if (lowerValue.includes('mm') || lowerValue.includes('millimeter')) {
        return value;
      }
      if (lowerValue.includes('inch') || lowerValue.includes('"') || lowerValue.includes('in')) {
        return value;
      }
      // If it's just a number, assume cm
      if (/^\d+(\.\d+)?$/.test(value)) {
        return `${value} cm`;
      }
    }
    
    // Return original value if no formatting applies
    return value;
  };

  const [expandedVariantIndex, setExpandedVariantIndex] = useState<number | null>(null);
  const [showHelpTooltip, setShowHelpTooltip] = useState<number | null>(null);

  // Auto-expand first variant when variants are added
  useEffect(() => {
    setExpandedVariantIndex(current => {
      // If we have variants but no expanded variant, expand the first one
      if (variants.length > 0 && current === null) {
        return 0;
      }
      // If all variants are removed, reset expanded index
      if (variants.length === 0) {
        return null;
      }
      // If the currently expanded variant is removed, expand the first one (or null if none)
      if (current !== null && current >= variants.length) {
        return variants.length > 0 ? 0 : null;
      }
      // Otherwise, keep current state
      return current;
    });
  }, [variants.length]); // Only depend on variants.length to avoid unnecessary re-renders

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

  // Limit childrenVariants fields to stock quantity when stockQuantity field is updated
  // This is handled in the updateVariant function below


  return (
    <>
      {/* Variants List */}
      {showVariants && (
        <div className="p-6 space-y-4">
            {variants.length === 0 ? (
              <div className="text-center py-8">
                <Layers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No variants added yet</p>
              </div>
            ) : (
              variants.map((variant, index) => {
                const isExpanded = expandedVariantIndex === index;
                // Price is now optional for variant completion
                const isComplete = variant.name && (variant.stockQuantity || 0) > 0;
                const profit = variant.price - variant.costPrice;
                const isProfitable = profit > 0;

                return (
                  <div
                    key={index}
                    className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-lg relative ${
                      isExpanded
                        ? 'border-blue-500 shadow-xl bg-blue-50/30'
                        : keyboardSelectionIndex === index
                          ? 'border-blue-400 shadow-lg bg-blue-50/20 ring-2 ring-blue-300'
                          : selectedVariants.has(index)
                            ? 'border-purple-400 shadow-lg bg-purple-50/20'
                            : isComplete
                              ? 'border-green-200 hover:border-green-300 hover:shadow-md'
                              : 'border-orange-300 hover:border-orange-400 hover:shadow-md border-gray-200'
                    } ${isReorderingVariants ? 'cursor-grabbing shadow-lg border-blue-300' : 'cursor-pointer'}`}
                    draggable={isReorderingVariants}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={() => setDraggedVariantIndex(null)}
                  >
                    {/* Variant Header - Clickable */}
                    <div
                      className="flex items-start justify-between p-6 cursor-pointer"
                      onClick={(e) => {
                        // If shift+click or ctrl+click, toggle selection instead of expanding
                        if (e.shiftKey || e.ctrlKey || e.metaKey) {
                          e.stopPropagation();
                          const newSelected = new Set(selectedVariants);
                          if (newSelected.has(index)) {
                            newSelected.delete(index);
                          } else {
                            newSelected.add(index);
                          }
                          setSelectedVariants(newSelected);
                        } else {
                          setExpandedVariantIndex(isExpanded ? null : index);
                        }
                      }}
                    >
                      {/* Left Section: Variant Info and Details */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Bulk Selection Checkbox */}
                        {variants.length > 1 && (
                          <div className="flex-shrink-0 mt-1">
                            <input
                              type="checkbox"
                              checked={selectedVariants.has(index)}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newSelected = new Set(selectedVariants);
                                if (e.target.checked) {
                                  newSelected.add(index);
                                } else {
                                  newSelected.delete(index);
                                }
                                setSelectedVariants(newSelected);
                              }}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                        {/* Variant Icon/Placeholder Area */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 relative">
                          <Layers className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-400" />
                          {/* Reordering indicator overlay */}
                          {isReorderingVariants && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" className="text-white">
                                <path d="M8 6h8v2H8V6zm0 5h8v2H8v-2zm0 5h8v2H8v-2z"/>
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Variant Details */}
                        <div className="flex-1 min-w-0">
                          {/* Name and Status Row */}
                          <div className="flex items-center gap-3 mb-4 flex-wrap">
                            <h3 className="text-2xl font-bold text-gray-900 truncate">
                              {variant.name || `Variant ${index + 1}`}
                            </h3>
                            {/* Status Badge */}
                            <div className={`inline-flex items-center justify-center p-1.5 sm:p-2 rounded-full border-2 border-white shadow-lg z-30 min-w-[3.5rem] sm:min-w-[4rem] min-h-[2rem] sm:min-h-[2.5rem] transition-all duration-300 ${
                              isComplete
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                : 'bg-gradient-to-r from-orange-500 to-red-500'
                            }`}>
                              <span className="text-xs sm:text-sm font-bold text-white whitespace-nowrap px-1">
                                {isComplete ? 'Complete' : 'Setup'}
                              </span>
                            </div>
                          </div>

                          {/* Information Tags Row */}
                          <div className="flex items-center gap-3 flex-wrap">
                            {/* Stock Quantity */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                              <Package className="w-5 h-5" />
                              <span className="text-base font-semibold">
                                {variant.stockQuantity || 0} in stock
                              </span>
                            </div>

                            {/* Minimum Stock Level */}
                            {(variant.minStockLevel || 0) > 0 && (
                              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                                <Hash className="w-5 h-5" />
                                <span className="text-base font-semibold">
                                  Min: {variant.minStockLevel || 0}
                                </span>
                              </div>
                            )}

                            {/* Stock Status */}
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border flex-shrink-0 ${
                              (variant.stockQuantity || 0) <= 0
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : (variant.stockQuantity || 0) <= (variant.minStockLevel || 5)
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : 'bg-green-50 text-green-700 border-green-200'
                            }`}>
                              <span className="text-base font-semibold">
                                {(variant.stockQuantity || 0) <= 0 ? 'Out of Stock' :
                                 (variant.stockQuantity || 0) <= (variant.minStockLevel || 5) ? 'Low Stock' :
                                 'In Stock'}
                              </span>
                            </div>

                            {/* Profit Margin */}
                            {isComplete && variant.costPrice > 0 && (
                              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
                                <div className="flex items-center gap-2">
                                  <DollarSign className={`w-5 h-5 ${isProfitable ? 'text-green-600' : 'text-red-600'}`} />
                                  <span className={`text-base font-semibold ${isProfitable ? 'text-green-700' : 'text-red-700'}`}>
                                    {Math.round(((variant.price - variant.costPrice) / variant.costPrice) * 100)}%
                                  </span>
                                  <span className={`text-sm font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                                    margin
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Section: Pricing and Actions */}
                      <div className="ml-4 flex-shrink-0">
                        <div className="flex flex-col items-end gap-3">

                          {/* Price Display */}
                        {variant.price > 0 && (
                          <div className="flex flex-col items-end">
                            <span className="text-3xl font-bold text-gray-900 leading-tight">
                              TSh {formatPrice(variant.price)}
                            </span>
                            {variant.costPrice > 0 && (
                              <span className="text-sm text-gray-500 mt-0.5 font-medium">
                                (Cost: TSh&nbsp;{formatPrice(variant.costPrice)})
                              </span>
                            )}
                          </div>
                        )}

                        {/* Delete Button */}
                        {!isReorderingVariants && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeVariant(index);
                            }}
                            disabled={variants.length === 1}
                            className={`p-2 rounded-lg transition-colors ${
                              variants.length === 1
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                            }`}
                            aria-label="Remove variant"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                          </div>
                        </div>
                      </div>

                    {/* Expanded Content - Only show when variant is expanded */}
                    {isExpanded ? (
                      <div className="px-6 pb-6 border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-transparent">
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

                        {/* SKU Field - Hidden/Automatic */}
                        {/* <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={variant.sku}
                              onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                              className="w-full py-3 pl-12 pr-4 bg-white/30 backdrop-blur-md border-2 rounded-lg focus:outline-none transition-colors border-gray-300 focus:border-purple-500 text-gray-900 font-mono"
                              placeholder="Enter variant SKU"
                              autoComplete="off"
                              autoCorrect="off"
                              spellCheck={false}
                            />
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-600" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                        </div> */}

                        {/* Stock and Pricing Fields */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {/* Stock Quantity */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Stock Qty</label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateVariant(index, 'stockQuantity', Math.max(0, (variant.stockQuantity || 0) - 1))}
                                className="w-14 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-xl transition-colors text-gray-700 font-bold"
                                aria-label="Decrease stock quantity"
                              >
                                <Minus className="w-5 h-5" />
                              </button>
                              <input
                                type="number"
                                value={variant.stockQuantity || ''}
                                onChange={(e) => updateVariant(index, 'stockQuantity', Math.max(0, parseInt(e.target.value) || 0))}
                                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-lg font-bold text-center"
                                placeholder="0"
                                min="0"
                              />
                              <button
                                type="button"
                                onClick={() => updateVariant(index, 'stockQuantity', (variant.stockQuantity || 0) + 1)}
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
                                onClick={() => updateVariant(index, 'minStockLevel', Math.max(0, (variant.minStockLevel || 0) - 1))}
                                className="w-14 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-xl transition-colors text-gray-700 font-bold"
                                aria-label="Decrease minimum stock level"
                              >
                                <Minus className="w-5 h-5" />
                              </button>
                              <input
                                type="number"
                                value={variant.minStockLevel || ''}
                                onChange={(e) => updateVariant(index, 'minStockLevel', Math.max(0, parseInt(e.target.value) || 0))}
                                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-lg font-bold text-center"
                                placeholder="0"
                                min="0"
                              />
                              <button
                                type="button"
                                onClick={() => updateVariant(index, 'minStockLevel', (variant.minStockLevel || 0) + 1)}
                                className="w-14 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-xl transition-colors text-gray-700 font-bold"
                                aria-label="Increase minimum stock level"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {/* Cost Price */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Cost Price</label>
                            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 focus-within:border-orange-500 transition-colors relative">
                              <span className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold transition-all duration-200 ${
                                variant.costPrice ? 'text-lg opacity-100 -top-1' : 'text-xl opacity-80'
                              }`}>
                                TSh
                              </span>
                              <input
                                type="text"
                                value={variant.costPrice ? formatPrice(variant.costPrice) : ''}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/,/g, '');
                                  updateVariant(index, 'costPrice', parseFloat(value) || 0);
                                }}
                                className={`w-full text-left text-lg font-bold text-gray-900 bg-transparent border-none outline-none transition-all duration-200 ${
                                  variant.costPrice ? 'pl-16' : 'pl-20'
                                }`}
                                placeholder=""
                                min="0"
                              />
                            </div>
                          </div>

                          {/* Selling Price */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Selling Price *</label>
                            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 focus-within:border-orange-500 transition-colors relative">
                              <span className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold transition-all duration-200 ${
                                variant.price ? 'text-lg opacity-100 -top-1' : 'text-xl opacity-80'
                              }`}>
                                TSh
                              </span>
                              <input
                                type="text"
                                value={variant.price ? formatPrice(variant.price) : ''}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/,/g, '');
                                  updateVariant(index, 'price', parseFloat(value) || 0);
                                }}
                                className={`w-full text-left text-lg font-bold text-gray-900 bg-transparent border-none outline-none transition-all duration-200 ${
                                  variant.price ? 'pl-16' : 'pl-20'
                                }`}
                                placeholder=""
                                min="0"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Children Variants Section - Optional */}
                        <ChildrenVariantsTracker
                          variant={{
                            childrenVariants: variant.childrenVariants,
                            useChildrenVariants: variant.useChildrenVariants,
                            stockQuantity: variant.stockQuantity
                          }}
                          variantIndex={index}
                          onUpdate={(field, value) => updateVariant(index, field as any, value)}
                          label="IMEI/Serial numbers"
                          itemLabel="IMEI/Serial number"
                          allVariants={variants}
                        />

                        {/* Specifications Button */}
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => onVariantSpecificationsClick(index)}
                            className="w-full bg-white border-2 border-gray-300 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all p-5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-md">
                                    <Layers className="w-6 h-6 text-white" />
                                  </div>
                                  {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="text-left flex-1">
                                  <h4 className="text-base font-bold text-gray-900">
                                    Specifications
                                  </h4>
                                  <p className="text-sm text-gray-600 mt-0.5">
                                    {variant.attributes && Object.keys(variant.attributes).length > 0 
                                      ? `${Object.keys(variant.attributes).length} spec${Object.keys(variant.attributes).length !== 1 ? 's' : ''} added`
                                      : 'Add variant specifications'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                                  <div className="px-3 py-1.5 bg-purple-600 text-white text-sm font-bold rounded-full shadow-md">
                                    {Object.keys(variant.attributes).length}
                                  </div>
                                )}
                                
                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    ) : null}
                    </div>
                );
              })
            )}
          </div>
        )}

        {/* Add Variant Button */}
        <div className="p-6 pt-0">
          <button
            type="button"
            onClick={addVariant}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-green-600 font-semibold"
          >
            <Plus size={20} />
            Add New Variant
          </button>
        </div>
    </>
  );
};

export default ProductVariantsSection;
