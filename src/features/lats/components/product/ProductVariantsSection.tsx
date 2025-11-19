import React, { useState } from 'react';
import { Layers, Plus, Trash2, Package, Move, Check } from 'lucide-react';
import { specificationCategories, getSpecificationsByCategory } from '../../../../data/specificationCategories';

interface ProductVariant {
  name: string;
  sku: string;
  attributes?: Record<string, any>;
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
    
    const newVariant: ProductVariant = {
      name: `Variant ${variants.length + 1}`,
      sku: generateVariantSKU(variants.length + 1),
      // Duplicate the previous variant's attributes/specifications
      attributes: lastVariant?.attributes ? { ...lastVariant.attributes } : {}
    };
    setVariants(prev => [...prev, newVariant]);
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
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

  return (
    <div className="border-b border-gray-200 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Layers size={20} className="text-green-600" />
          Product Variants
        </h3>
        
        <div className="flex items-center gap-3">
          {variants.length > 0 && (
            <button
              type="button"
              onClick={() => setIsReorderingVariants(!isReorderingVariants)}
              className={`text-xs px-3 py-1 rounded ${
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
      
      {showVariants && (
        <div className="space-y-4">
          {/* Variants List */}
          <div className="space-y-3">
            {variants.map((variant, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                draggable={isReorderingVariants}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={() => setDraggedVariantIndex(null)}
                style={{ cursor: isReorderingVariants ? 'grabbing' : 'grab' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {isReorderingVariants && (
                      <div className="w-6 h-6 flex items-center justify-center text-gray-400">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 6h8v2H8V6zm0 5h8v2H8v-2zm0 5h8v2H8v-2z"/>
                        </svg>
                      </div>
                    )}
                    <h4 className="font-medium text-gray-900">
                      {variant.name || `Variant ${index + 1}`}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isReorderingVariants && (
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        disabled={variants.length === 1}
                        className={`p-1 rounded transition-colors ${
                          variants.length === 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                        }`}
                        aria-label="Remove variant"
                        title={variants.length === 1 ? 'Cannot delete the last variant. At least one variant is required.' : 'Remove variant'}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Variant Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Variant Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) => updateVariant(index, 'name', e.target.value)}
                      className="w-full py-3 pl-12 pr-4 bg-white/30 backdrop-blur-md border-2 rounded-lg focus:outline-none transition-colors border-gray-300 focus:border-blue-500"
                      placeholder="Enter variant name (e.g., 256GB - Space Black)"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  </div>
                </div>



                {/* Specifications Button */}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => onVariantSpecificationsClick(index)}
                    className="w-full bg-white border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:shadow-lg transition-all p-5"
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
            ))}
          </div>

          {/* Add Variant Button */}
          <button
            type="button"
            onClick={addVariant}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
          >
            <Plus size={20} />
            Add New Variant
          </button>
        </div>
      )}
      

    </div>
  );
};

export default ProductVariantsSection;
