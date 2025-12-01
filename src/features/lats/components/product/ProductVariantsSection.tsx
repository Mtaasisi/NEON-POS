import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, Package, Move, Check, DollarSign, ChevronDown, ChevronUp, Minus, QrCode, Smartphone, X, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { specificationCategories, getSpecificationsByCategory } from '../../../../data/specificationCategories';

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
  baseSku
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
      const currentChildren = currentVariant.childrenVariants || [];
      
      // If stock is set to 0, disable children variants
      if (newStockQuantity === 0 && currentVariant.useChildrenVariants) {
        setVariants(prev => prev.map((variant, i) => 
          i === index 
            ? { ...variant, [field]: value, childrenVariants: [], useChildrenVariants: false }
            : variant
        ));
        return;
      }
      
      // If tracking is enabled and stock is reduced, trim excess fields
      if (currentVariant.useChildrenVariants && newStockQuantity > 0) {
        if (currentChildren.length > newStockQuantity) {
          // Trim excess fields
          const updatedChildren = currentChildren.slice(0, newStockQuantity);
          setVariants(prev => prev.map((variant, i) => 
            i === index 
              ? { ...variant, [field]: value, childrenVariants: updatedChildren }
              : variant
          ));
          toast.info(`Reduced IMEI/Serial number fields to ${newStockQuantity} to match stock quantity.`);
          return;
        }
        // If stock increased, don't auto-add fields - let user add them manually
      }
    }
    
    // Check for duplicate variant names when updating the name field
    if (field === 'name' && value) {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        // Check if another variant (excluding current) has the same name (case-insensitive)
        const isDuplicate = variants.some((variant, i) => 
          i !== index && variant.name?.toLowerCase().trim() === trimmedValue.toLowerCase()
        );
        
        if (isDuplicate) {
          toast.error(`A variant with the name "${trimmedValue}" already exists in this product`);
          return;
        }
      }
    }
    
    // Check for duplicate children variants (IMEI/Serial numbers) when updating childrenVariants
    if (field === 'childrenVariants' && Array.isArray(value)) {
      const currentVariant = variants[index];
      const stockQuantity = currentVariant.stockQuantity || 0;
      const trimmedChildren = value.map(c => c.trim()).filter(Boolean);
      
      // Check if total number of fields (including empty) exceeds stock quantity
      if (value.length > stockQuantity) {
        toast.error(`Cannot have more than ${stockQuantity} IMEI/Serial number fields. Stock quantity is ${stockQuantity}.`);
        // Limit to stock quantity
        const limitedValue = value.slice(0, stockQuantity);
        setVariants(prev => prev.map((variant, i) => 
          i === index ? { ...variant, [field]: limitedValue } : variant
        ));
        return;
      }
      
      // Check if number of filled IMEI/Serial numbers exceeds stock quantity
      if (trimmedChildren.length > stockQuantity) {
        toast.error(`Cannot add more than ${stockQuantity} filled IMEI/Serial numbers. Stock quantity is ${stockQuantity}.`);
        return;
      }
      
      // Check for duplicates within the same variant
      const uniqueChildren = new Set(trimmedChildren.map(c => c.toLowerCase()));
      if (trimmedChildren.length !== uniqueChildren.size) {
        const duplicate = trimmedChildren.find((child, i) => 
          trimmedChildren.findIndex(c => c.toLowerCase() === child.toLowerCase()) !== i
        );
        toast.error(`Duplicate IMEI/Serial number "${duplicate}" found in this variant. Each item must be unique.`);
        return;
      }
      
      // Check for duplicates across ALL variants in the product (case-insensitive)
      for (const child of trimmedChildren) {
        const isDuplicateInOtherVariants = variants.some((variant, i) => {
          if (i === index) return false; // Skip current variant
          const otherChildren = variant.childrenVariants || [];
          return otherChildren.some(c => c.trim().toLowerCase() === child.toLowerCase());
        });
        
        if (isDuplicateInOtherVariants) {
          toast.error(`IMEI/Serial number "${child}" already exists in another variant of this product. Each item must be unique across all variants.`);
          return;
        }
      }
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

  // Helper function to format numbers with comma separators
  const formatPrice = (price: number | string): string => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (num % 1 === 0) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="mb-6">
      {/* Product Variants Card */}
      <div className="border-2 rounded-2xl bg-white shadow-sm border-gray-200 mb-6">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Product Variants</h3>
                {variants.length > 0 && (
                  <p className="text-xs text-gray-600 mt-1">{variants.length} variant{variants.length !== 1 ? 's' : ''} added</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {variants.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsReorderingVariants(!isReorderingVariants)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    isReorderingVariants 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title="Toggle reorder mode"
                >
                  <Move size={14} className="inline mr-1" />
                  {isReorderingVariants ? 'Done' : 'Reorder'}
                </button>
              )}
            </div>
          </div>
        </div>
        
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
                const isComplete = variant.name && variant.price > 0;
                const profit = variant.price - variant.costPrice;
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
                            {variant.price > 0 && (
                              <p className="text-sm text-gray-600 mt-1">Price: {formatPrice(variant.price)} TZS</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {/* Profit Badge */}
                        {isComplete && variant.costPrice > 0 && (
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
                            disabled={variants.length === 1}
                            className={`p-2 rounded-xl transition-colors ${
                              variants.length === 1
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                            }`}
                            aria-label="Remove variant"
                            title={variants.length === 1 ? 'Cannot delete the last variant. At least one variant is required.' : 'Remove variant'}
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

                        {/* Pricing and Stock Fields */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {/* Cost Price */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Cost Price</label>
                            <input
                              type="text"
                              value={variant.costPrice ? formatPrice(variant.costPrice) : ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/,/g, '');
                                updateVariant(index, 'costPrice', parseFloat(value) || 0);
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
                              value={variant.price ? formatPrice(variant.price) : ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/,/g, '');
                                updateVariant(index, 'price', parseFloat(value) || 0);
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
                        </div>

                        {/* Children Variants Section - Optional */}
                        <div className="mt-4 border-2 border-indigo-200 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-purple-50/50 overflow-hidden shadow-sm">
                          {/* Header Toggle */}
                          <div 
                            className="p-4 cursor-pointer hover:bg-indigo-100/50 transition-colors"
                            onClick={() => {
                              const useChildren = !variant.useChildrenVariants;
                              updateVariant(index, 'useChildrenVariants', useChildren);
                              if (useChildren) {
                                // Initialize with one empty field (user can add more)
                                const stockQuantity = variant.stockQuantity || 0;
                                if (stockQuantity > 0) {
                                  // Start with one empty field, user can add more up to stock quantity
                                  const currentChildren = variant.childrenVariants || [];
                                  if (currentChildren.length === 0) {
                                    updateVariant(index, 'childrenVariants', ['']);
                                  }
                                } else {
                                  toast.error('Please set stock quantity first before tracking individual items.');
                                  // Don't enable if stock is 0
                                  updateVariant(index, 'useChildrenVariants', false);
                                }
                              } else {
                                // Clear when disabling
                                updateVariant(index, 'childrenVariants', []);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                  variant.useChildrenVariants 
                                    ? 'bg-indigo-600 shadow-lg shadow-indigo-200' 
                                    : 'bg-gray-200'
                                }`}>
                                  <Smartphone className={`w-5 h-5 ${
                                    variant.useChildrenVariants ? 'text-white' : 'text-gray-500'
                                  }`} />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-gray-900">
                                    Track Individual Items
                                  </h4>
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    Add IMEI/Serial numbers for each unit
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {variant.useChildrenVariants && (
                                  <div className={`px-3 py-1.5 text-white text-xs font-bold rounded-full shadow-md ${
                                    (variant.childrenVariants || []).filter(c => c.trim()).length > (variant.stockQuantity || 0)
                                      ? 'bg-red-600'
                                      : (variant.childrenVariants || []).filter(c => c.trim()).length === (variant.stockQuantity || 0)
                                      ? 'bg-green-600'
                                      : 'bg-indigo-600'
                                  }`}>
                                    {(variant.childrenVariants || []).filter(c => c.trim()).length} / {variant.stockQuantity || 0} items
                                  </div>
                                )}
                                <div className={`w-12 h-6 rounded-full transition-all duration-300 ${
                                  variant.useChildrenVariants ? 'bg-indigo-600' : 'bg-gray-300'
                                }`}>
                                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 mt-0.5 ${
                                    variant.useChildrenVariants ? 'translate-x-6' : 'translate-x-0.5'
                                  }`} />
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Children Input Section */}
                          {variant.useChildrenVariants && (
                            <div className="px-4 pb-4 space-y-3">
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {(() => {
                                  const stockQuantity = variant.stockQuantity || 0;
                                  const currentChildren = variant.childrenVariants || [];
                                  
                                  // Show only existing fields (can be less than stock quantity)
                                  return currentChildren.map((child, childIndex) => {
                                    const isFilled = child && child.trim() !== '';
                                    
                                    return (
                                    <div 
                                      key={childIndex} 
                                      className={`group relative flex items-center gap-2 p-2 rounded-xl border-2 transition-all shadow-sm hover:shadow-md ${
                                        isFilled
                                          ? 'bg-white border-indigo-200 hover:border-indigo-300'
                                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      <div className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold flex-shrink-0 ${
                                        isFilled
                                          ? 'bg-indigo-100 text-indigo-700'
                                          : 'bg-gray-200 text-gray-500'
                                      }`}>
                                        {childIndex + 1}
                                      </div>
                                      <div className="flex-1 relative">
                                        <QrCode className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                                          isFilled ? 'text-gray-400' : 'text-gray-300'
                                        }`} />
                                        <input
                                          type="text"
                                          value={child}
                                          onChange={(e) => {
                                            const newChildren = [...currentChildren];
                                            newChildren[childIndex] = e.target.value;
                                            updateVariant(index, 'childrenVariants', newChildren);
                                          }}
                                          placeholder={`Enter IMEI or Serial #${childIndex + 1}`}
                                          className={`w-full pl-10 pr-10 py-2.5 border-0 rounded-lg focus:outline-none focus:ring-2 text-sm font-medium bg-transparent ${
                                            isFilled
                                              ? 'text-gray-900 focus:ring-indigo-500'
                                              : 'text-gray-400 focus:ring-gray-400'
                                          }`}
                                        />
                                        {isFilled && (
                                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                            <Check className="w-4 h-4 text-green-500" />
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newChildren = [...currentChildren];
                                          // Remove this field from the array
                                          newChildren.splice(childIndex, 1);
                                          updateVariant(index, 'childrenVariants', newChildren);
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-red-100 text-red-600 hover:bg-red-200"
                                        title="Remove this field"
                                      >
                                        Skip
                                      </button>
                                    </div>
                                    );
                                  });
                                })()}
                              </div>
                              
                              {/* Add Field Button */}
                              {(() => {
                                const stockQuantity = variant.stockQuantity || 0;
                                const currentChildren = variant.childrenVariants || [];
                                const currentCount = currentChildren.length;
                                const canAddMore = currentCount < stockQuantity;
                                const remaining = stockQuantity - currentCount;
                                
                                return (
                                  canAddMore && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newChildren = [...(variant.childrenVariants || []), ''];
                                        updateVariant(index, 'childrenVariants', newChildren);
                                      }}
                                      className="w-full px-4 py-3 border-2 border-dashed border-indigo-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 text-indigo-600 text-sm font-bold shadow-sm hover:shadow-md"
                                    >
                                      <Plus size={18} className="text-indigo-600" />
                                      Add Field ({remaining} remaining)
                                    </button>
                                  )
                                );
                              })()}
                              
                              {/* Help Button with Tooltip */}
                              <div className="flex items-center justify-between pt-2">
                                <div className="text-xs font-semibold text-indigo-900">
                                  Stock: {variant.stockQuantity || 0} items. Fields: {(variant.childrenVariants || []).length} / {variant.stockQuantity || 0}. Filled: {(variant.childrenVariants || []).filter(c => c.trim()).length}
                                </div>
                                <div className="relative help-tooltip-container">
                                  <button
                                    type="button"
                                    onClick={() => setShowHelpTooltip(showHelpTooltip === index ? null : index)}
                                    className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    title="Click for help"
                                    aria-label="Show help information"
                                    aria-expanded={showHelpTooltip === index}
                                  >
                                    <HelpCircle size={16} />
                                  </button>
                                  
                                  {/* Tooltip - Show on click */}
                                  {(showHelpTooltip === index) && (
                                    <div className="absolute right-0 bottom-full mb-2 w-72 bg-white rounded-lg shadow-xl border-2 border-indigo-200 p-4 z-50">
                                      <div className="absolute bottom-0 right-4 transform translate-y-full">
                                        <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-indigo-200"></div>
                                      </div>
                                      <div className="relative">
                                        <div className="flex items-center justify-between mb-2">
                                          <h4 className="text-sm font-bold text-indigo-900">Track Individual Items</h4>
                                          <button
                                            type="button"
                                            onClick={() => setShowHelpTooltip(null)}
                                            className="text-indigo-400 hover:text-indigo-600 transition-colors"
                                            aria-label="Close help"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                        <ul className="text-xs text-indigo-800 space-y-1.5">
                                          <li className="flex items-start gap-2">
                                            <span className="text-indigo-600 font-bold mt-0.5">•</span>
                                            <span>Each IMEI/Serial number will be created as a child variant</span>
                                          </li>
                                          <li className="flex items-start gap-2">
                                            <span className="text-indigo-600 font-bold mt-0.5">•</span>
                                            <span>Add fields as needed (up to {variant.stockQuantity || 0} based on stock quantity)</span>
                                          </li>
                                          <li className="flex items-start gap-2">
                                            <span className="text-indigo-600 font-bold mt-0.5">•</span>
                                            <span>Use the "Skip" button to remove a field</span>
                                          </li>
                                          <li className="flex items-start gap-2">
                                            <span className="text-indigo-600 font-bold mt-0.5">•</span>
                                            <span>Stock quantity determines the maximum number of fields</span>
                                          </li>
                                        </ul>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

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
                    )}
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
      </div>
    </div>
  );
};

export default ProductVariantsSection;
