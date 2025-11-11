import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Package, Smartphone } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { format } from '../../lats/lib/format';
import toast from 'react-hot-toast';

interface MobileVariantSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onSelectVariant: (variant: any) => void;
}

const MobileVariantSelectionModal: React.FC<MobileVariantSelectionModalProps> = ({
  isOpen,
  onClose,
  product,
  onSelectVariant
}) => {
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [childVariants, setChildVariants] = useState<{ [key: string]: any[] }>({});
  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(new Set());

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setExpandedParents(new Set());
      setChildVariants({});
      setLoadingChildren(new Set());
    } else {
      // Auto-expand if single parent variant
      if (product?.variants?.length === 1) {
        const variant = product.variants[0];
        checkAndExpandIfParent(variant.id);
      }
    }
  }, [isOpen, product]);

  // Check if variant is a parent
  const isParentVariant = (variant: any): boolean => {
    const variantType = variant.variant_type || variant.variantType;
    const isParentFlag = variant.is_parent || variant.isParent;
    return variantType === 'parent' || isParentFlag === true;
  };

  // Check and auto-expand parent variants
  const checkAndExpandIfParent = async (variantId: string) => {
    try {
      const { count } = await supabase
        .from('lats_product_variants')
        .select('id', { count: 'exact', head: true })
        .eq('parent_variant_id', variantId)
        .eq('is_active', true);
      
      if ((count || 0) > 0) {
        setExpandedParents(new Set([variantId]));
        loadChildVariants(variantId);
      }
    } catch (error) {
      console.error('Error checking for children:', error);
    }
  };

  // Load child variants for a parent
  const loadChildVariants = async (parentVariantId: string) => {
    if (childVariants[parentVariantId]) return;

    setLoadingChildren(prev => new Set(prev).add(parentVariantId));

    try {
      const { data, error } = await supabase
        .from('lats_product_variants')
        .select('*')
        .eq('parent_variant_id', parentVariantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setChildVariants(prev => ({
        ...prev,
        [parentVariantId]: data || []
      }));
    } catch (error) {
      console.error('Error loading child variants:', error);
      toast.error('Failed to load devices');
    } finally {
      setLoadingChildren(prev => {
        const newSet = new Set(prev);
        newSet.delete(parentVariantId);
        return newSet;
      });
    }
  };

  // Toggle parent expansion
  const toggleParentExpansion = (parentVariantId: string) => {
    const newExpanded = new Set(expandedParents);
    
    if (newExpanded.has(parentVariantId)) {
      newExpanded.delete(parentVariantId);
    } else {
      newExpanded.add(parentVariantId);
      if (!childVariants[parentVariantId]) {
        loadChildVariants(parentVariantId);
      }
    }
    
    setExpandedParents(newExpanded);
  };

  // Handle variant selection
  const handleSelectVariant = (variant: any) => {
    if (isParentVariant(variant)) {
      const children = childVariants[variant.id];
      if (!children || children.length === 0) {
        // Parent has no children, select it directly
        onSelectVariant(variant);
        onClose();
      } else {
        // Expand to show children
        toast('Please select a specific device');
        if (!expandedParents.has(variant.id)) {
          toggleParentExpansion(variant.id);
        }
      }
    } else {
      // Regular or child variant
      onSelectVariant(variant);
      onClose();
    }
  };

  if (!isOpen) return null;

  const variants = product?.variants || [];
  const parentVariants = variants.filter((v: any) => !v.parent_variant_id);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className="w-full bg-white rounded-t-3xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">{product?.name}</h2>
            <p className="text-sm text-gray-500">Select a variant</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Variants List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {parentVariants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Package size={48} className="mb-4" />
              <p className="text-lg font-medium">No variants available</p>
            </div>
          ) : (
            parentVariants.map((variant: any) => {
              const isParent = isParentVariant(variant);
              const isExpanded = expandedParents.has(variant.id);
              const children = childVariants[variant.id] || [];
              const isLoadingChildren = loadingChildren.has(variant.id);
              const stockQty = variant.quantity || variant.stock_quantity || 0;
              const isOutOfStock = stockQty <= 0;
              const isLowStock = stockQty > 0 && stockQty <= 5;

              return (
                <div key={variant.id} className="space-y-2">
                  {/* Parent/Regular Variant Card */}
                  <button
                    onClick={() => isParent ? toggleParentExpansion(variant.id) : handleSelectVariant(variant)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-98 ${
                      isOutOfStock 
                        ? 'bg-gray-50 border-gray-200 opacity-60' 
                        : 'bg-white border-gray-200 active:border-blue-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Variant Name */}
                        <div className="flex items-center gap-2 mb-1">
                          {isParent && <Smartphone size={16} className="text-blue-500 flex-shrink-0" />}
                          <h3 className="font-semibold text-gray-900 truncate">
                            {variant.variant_name || variant.name || 'Unnamed Variant'}
                          </h3>
                        </div>

                        {/* SKU */}
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                          <Tag size={12} />
                          {variant.sku}
                        </p>

                        {/* Price and Stock */}
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-900">
                            {format.currency(variant.selling_price || variant.unit_price || 0)}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isOutOfStock 
                              ? 'bg-red-100 text-red-700' 
                              : isLowStock 
                              ? 'bg-orange-100 text-orange-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {isOutOfStock ? 'Out of stock' : `${stockQty} in stock`}
                          </span>
                        </div>

                        {/* Children count indicator */}
                        {isParent && children.length > 0 && (
                          <p className="text-xs text-blue-600 mt-2 font-medium">
                            {children.length} device{children.length !== 1 ? 's' : ''} available
                          </p>
                        )}
                      </div>

                      {/* Expand/Collapse Icon */}
                      {isParent && (
                        <div className="flex-shrink-0">
                          {isLoadingChildren ? (
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          ) : isExpanded ? (
                            <ChevronUp size={24} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={24} className="text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Child Variants (IMEI devices) */}
                  {isParent && isExpanded && children.length > 0 && (
                    <div className="pl-4 space-y-2">
                      {children.map((child: any) => {
                        const childStock = child.quantity || 0;
                        const childOutOfStock = childStock <= 0;
                        const imei = child.variant_attributes?.imei || child.attributes?.imei;
                        
                        return (
                          <button
                            key={child.id}
                            onClick={() => handleSelectVariant(child)}
                            disabled={childOutOfStock}
                            className={`w-full text-left p-3 rounded-xl border transition-all active:scale-98 ${
                              childOutOfStock
                                ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                                : 'bg-blue-50 border-blue-200 active:border-blue-400'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Smartphone size={14} className="text-blue-500" />
                              <span className="text-sm font-medium text-gray-900">
                                {child.variant_name || child.name || 'Device'}
                              </span>
                            </div>
                            
                            {imei && (
                              <p className="text-xs text-gray-600 mb-1">
                                IMEI: {imei}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-gray-900">
                                {format.currency(child.selling_price || child.unit_price || 0)}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                childOutOfStock 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {childOutOfStock ? 'Sold' : 'Available'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* No children message */}
                  {isParent && isExpanded && children.length === 0 && !isLoadingChildren && (
                    <div className="pl-4 py-3 text-center text-sm text-gray-400">
                      No devices available
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Helper */}
        {parentVariants.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <AlertCircle size={14} />
              <span>Tap a variant to add it to your cart</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileVariantSelectionModal;

