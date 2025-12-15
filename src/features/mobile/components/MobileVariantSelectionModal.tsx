import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Package, Smartphone, AlertCircle, Tag, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { formatCurrency } from '../../../lib/currencyUtils';
import toast from 'react-hot-toast';
import MobileFullScreenSheet from './MobileFullScreenSheet';
import { useBranch } from '../../../context/BranchContext';

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
  const { currentBranch } = useBranch();
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [childVariants, setChildVariants] = useState<{ [key: string]: any[] }>({});
  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) {
      setExpandedParents(new Set());
      setChildVariants({});
      setLoadingChildren(new Set());
    } else {
      loadFromGlobalCache();
      
      if (product?.variants?.length === 1) {
        const variant = product.variants[0];
        checkAndExpandIfParent(variant.id);
      }
    }
  }, [isOpen, product, currentBranch]);

  const loadFromGlobalCache = async () => {
    if (!product?.variants) return;

    try {
      const { childVariantsCacheService } = await import('../../../services/childVariantsCacheService');
      
      if (!childVariantsCacheService.isCacheValid()) {
        if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
          console.log("ℹ️ Mobile: Global cache not ready, using fallback query (this is normal on first load)");
        }
        await loadLocalFallback();
        return;
      }

      const variantIds = product.variants.map((v: any) => v.id);
      const childrenByParent: { [key: string]: any[] } = {};

      variantIds.forEach((variantId: string) => {
        const cachedChildren = childVariantsCacheService.getChildVariants(variantId);
        if (cachedChildren && cachedChildren.length > 0) {
          childrenByParent[variantId] = cachedChildren;
        }
      });

      setChildVariants(childrenByParent);
    } catch (error) {
      console.error('Mobile: Error loading from cache:', error);
      await loadLocalFallback();
    }
  };

  const loadLocalFallback = async () => {
    if (!product?.variants) return;

    const variantIds = product.variants.map((v: any) => v.id);
    if (variantIds.length === 0) return;

    const parentPriceMap = new Map<string, number>();
    product.variants.forEach((variant: any) => {
      if (variant.id) {
        const parentPrice = variant.sellingPrice ?? variant.selling_price ?? variant.price ?? 0;
        parentPriceMap.set(variant.id, parentPrice);
      }
    });
    
    const { data, error } = await supabase
      .from('lats_product_variants')
      .select('*')
      .in('parent_variant_id', variantIds)
      .eq('branch_id', currentBranch?.id) // Filter by current branch
      .eq('variant_type', 'imei_child')
      .eq('is_active', true)
      .gt('quantity', 0)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return;
    }

    const childrenByParent: { [key: string]: any[] } = {};
    data.forEach(child => {
      const parentId = child.parent_variant_id;
      if (!childrenByParent[parentId]) {
        childrenByParent[parentId] = [];
      }
      
      const childPrice = child.selling_price || child.sellingPrice || child.price;
      const parentPrice = parentPriceMap.get(parentId) || 0;
      const finalPrice = childPrice && childPrice > 0 ? childPrice : parentPrice;
      
      childrenByParent[parentId].push({
        ...child,
        sellingPrice: finalPrice,
        price: finalPrice,
      });
    });

    setChildVariants(childrenByParent);
  };

  const isParentVariant = (variant: any): boolean => {
    const variantType = variant.variant_type || variant.variantType;
    const isParentFlag = variant.is_parent || variant.isParent;
    return variantType === 'parent' || isParentFlag === true;
  };

  const checkAndExpandIfParent = async (variantId: string) => {
    try {
      const { count } = await supabase
        .from('lats_product_variants')
        .select('id', { count: 'exact', head: true })
        .eq('parent_variant_id', variantId)
        .eq('branch_id', currentBranch?.id) // Filter by current branch
        .eq('is_active', true);
      
      if ((count || 0) > 0) {
        setExpandedParents(new Set([variantId]));
        loadChildVariants(variantId);
      }
    } catch (error) {
      console.error('Error checking for children:', error);
    }
  };

  const loadChildVariants = async (parentVariantId: string) => {
    if (childVariants[parentVariantId]) {
      return;
    }

    setLoadingChildren(prev => new Set(prev).add(parentVariantId));

    try {
      const parentVariant = product?.variants?.find((v: any) => v.id === parentVariantId);
      const parentPrice = parentVariant?.sellingPrice ?? parentVariant?.selling_price ?? parentVariant?.price ?? 0;

      const { data, error } = await supabase
        .from('lats_product_variants')
        .select('*')
        .eq('parent_variant_id', parentVariantId)
        .eq('branch_id', currentBranch?.id) // Filter by current branch
        .eq('variant_type', 'imei_child')
        .eq('is_active', true)
        .gt('quantity', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedChildren = (data || []).map((child: any) => {
        const childPrice = child.selling_price || child.sellingPrice || child.price;
        const finalPrice = childPrice && childPrice > 0 ? childPrice : parentPrice;
        
        return {
          ...child,
          sellingPrice: finalPrice,
          price: finalPrice,
        };
      });

      setChildVariants(prev => ({
        ...prev,
        [parentVariantId]: formattedChildren
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

  const handleSelectVariant = (variant: any) => {
    if (isParentVariant(variant)) {
      const children = childVariants[variant.id];
      if (!children || children.length === 0) {
        onSelectVariant(variant);
        onClose();
      } else {
        toast('Please select a specific device');
        if (!expandedParents.has(variant.id)) {
          toggleParentExpansion(variant.id);
        }
      }
    } else {
      onSelectVariant(variant);
      onClose();
    }
  };

  if (!isOpen) return null;

  let variants = product?.variants || [];
  
  // Filter variants by current branch
  variants = variants.filter((v: any) => v.branch_id === currentBranch?.id);

  let parentVariants = variants.filter((v: any) => {
    if (v.parent_variant_id) return false;
    const quantity = v.quantity ?? v.stockQuantity ?? v.stock_quantity ?? 0;
    const isActive = v.is_active !== false && v.isActive !== false;
    return quantity > 0 && isActive;
  });
  
  if (parentVariants.length === 0 && variants.length > 0) {
    parentVariants = variants.filter((v: any) => {
      if (v.parent_variant_id) return false;
      const isActive = v.is_active !== false && v.isActive !== false;
      return isActive;
    });
  }
  
  if (parentVariants.length === 0 && variants.length > 0) {
    parentVariants = variants.filter((v: any) => !v.parent_variant_id);
  }

  return (
    <MobileFullScreenSheet
      isOpen={isOpen}
      onClose={onClose}
      title={product?.name}
      subtitle="Select a variant"
      leftButtonText="Cancel"
    >
      {/* Variants List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-100">
        {parentVariants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
            <Package size={48} className="mb-4" />
            <p className="text-[17px] font-medium">No variants available</p>
          </div>
        ) : (
          parentVariants.map((variant: any) => {
            const isParent = isParentVariant(variant);
            const isExpanded = expandedParents.has(variant.id);
            const children = childVariants[variant.id] || [];
            const isLoadingChildren = loadingChildren.has(variant.id);
            const stockQty = variant.quantity || variant.stock_quantity || 0;
            const isOutOfStock = stockQty <= 0;
            const isLowStock = stockQty > 0 && stockQty > 0 && stockQty <= 5;

            return (
              <div key={variant.id} className="space-y-2">
                {/* Parent/Regular Variant Card */}
                <button
                  onClick={() => isParent ? toggleParentExpansion(variant.id) : handleSelectVariant(variant)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-98 shadow-sm ${
                    isOutOfStock 
                      ? 'bg-neutral-50 border-neutral-200 opacity-60' 
                      : 'bg-white border-neutral-200 active:border-primary-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Variant Name */}
                      <div className="flex items-center gap-2 mb-1">
                        {isParent && <Smartphone size={16} className="text-primary-500 flex-shrink-0" />}
                        <h3 className="font-semibold text-neutral-900 text-[16px] truncate">
                          {variant.variant_name || variant.name || 'Unnamed Variant'}
                        </h3>
                      </div>

                      {/* SKU */}
                      <p className="text-[13px] text-neutral-500 mb-2 flex items-center gap-1">
                        <Tag size={12} className="text-neutral-400" />
                        {variant.sku}
                      </p>

                      {/* Price and Stock */}
                      <div className="flex items-center gap-3">
                        <span className="text-[18px] font-bold text-neutral-900">
                          {formatCurrency(variant.selling_price || variant.unit_price || 0)}
                        </span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          isOutOfStock 
                            ? 'bg-danger-100 text-danger-700' 
                            : isLowStock 
                            ? 'bg-warning-100 text-warning-700' 
                            : 'bg-success-100 text-success-700'
                        }`}>
                          {isOutOfStock ? 'Out of stock' : `${stockQty} in stock`}
                        </span>
                      </div>

                      {/* Children count indicator */}
                      {isParent && children.length > 0 && (
                        <p className="text-[13px] text-primary-600 mt-2 font-medium">
                          {children.length} device{children.length !== 1 ? 's' : ''} available
                        </p>
                      )}
                    </div>

                    {/* Expand/Collapse Icon */}
                    {isParent && (
                      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                        {isLoadingChildren ? (
                          <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        ) : isExpanded ? (
                          <ChevronUp size={20} className="text-neutral-400" strokeWidth={2.5} />
                        ) : (
                          <ChevronDown size={20} className="text-neutral-400" strokeWidth={2.5} />
                        )}
                      </div>
                    )}
                  </div>
                </button>

                {/* Child Variants (IMEI devices) */}
                {isParent && isExpanded && children.length > 0 && (
                  <div className="pl-4 pr-1 space-y-2">
                    {children.map((child: any) => {
                      const childStock = child.quantity || 0;
                      const childOutOfStock = childStock <= 0;
                      const imei = child.variant_attributes?.imei || child.attributes?.imei;
                      
                      return (
                        <button
                          key={child.id}
                          onClick={() => handleSelectVariant(child)}
                          disabled={childOutOfStock}
                          className={`w-full text-left p-3 rounded-xl border transition-all active:scale-98 shadow-sm ${
                            childOutOfStock
                              ? 'bg-neutral-50 border-neutral-200 opacity-50 cursor-not-allowed'
                              : 'bg-primary-50 border-primary-200 active:border-primary-400'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Smartphone size={14} className="text-primary-500" />
                            <span className="text-[14px] font-medium text-neutral-900">
                              {child.variant_name || child.name || 'Device'}
                            </span>
                          </div>
                          
                          {imei && (
                            <p className="text-[13px] text-neutral-600 mb-1">
                              IMEI: {imei}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <span className="text-[15px] font-bold text-neutral-900">
                              {formatCurrency(child.sellingPrice || child.selling_price || child.price || child.unit_price || 0)}
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                              childOutOfStock 
                                ? 'bg-danger-100 text-danger-700' 
                                : 'bg-success-100 text-success-700'
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
                  <div className="pl-4 py-3 text-center text-[14px] text-neutral-400">
                    No devices available in this branch
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Helper */}
      {parentVariants.length > 0 && (
        <div className="p-4 bg-white border-t border-neutral-200 safe-area-inset-bottom">
          <div className="flex items-center gap-2 text-[13px] text-neutral-600">
            <AlertCircle size={14} />
            <span>Tap a variant to add it to your cart</span>
          </div>
        </div>
      )}
    </MobileFullScreenSheet>
  );
};

export default MobileVariantSelectionModal;
