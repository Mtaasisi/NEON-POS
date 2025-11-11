import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, ChevronUp, Package, Tag, AlertCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { format } from '../../lib/format';
import { toast } from 'react-hot-toast';

interface VariantSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onSelectVariant: (product: any, variant: any, quantity: number) => void;
}

const VariantSelectionModal: React.FC<VariantSelectionModalProps> = ({
  isOpen,
  onClose,
  product,
  onSelectVariant
}) => {
  console.log('🚀 VariantSelectionModal loaded! isOpen:', isOpen);
  
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [childVariants, setChildVariants] = useState<{ [key: string]: any[] }>({});
  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(new Set());
  const [selectedQuantities, setSelectedQuantities] = useState<{ [key: string]: number }>({});
  const [variantChildCounts, setVariantChildCounts] = useState<{ [key: string]: number }>({});
  const [searchQuery, setSearchQuery] = useState<{ [key: string]: string }>({});
  const [focusedVariantIndex, setFocusedVariantIndex] = useState(0);
  const [focusedChildIndex, setFocusedChildIndex] = useState<{ [key: string]: number }>({});

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setExpandedParents(new Set());
      setChildVariants({});
      setLoadingChildren(new Set());
      setSelectedQuantities({});
      setVariantChildCounts({});
      setSearchQuery({});
      setFocusedVariantIndex(0);
      setFocusedChildIndex({});
    } else {
      // Focus first variant when opening
      setFocusedVariantIndex(0);
      
      // ✅ AUTO-EXPAND: If single parent variant with children, auto-expand it
      const autoExpandSingleParent = async () => {
        if (product?.variants?.length === 1) {
          const singleVariant = product.variants[0];
          const isParentByFlag = singleVariant.is_parent || singleVariant.variant_type === 'parent';
          
          // Check if has children (either by flag or database)
          let hasChildren = isParentByFlag;
          
          if (!hasChildren) {
            try {
              const { count } = await supabase
                .from('lats_product_variants')
                .select('id', { count: 'exact', head: true })
                .eq('parent_variant_id', singleVariant.id)
                .eq('variant_type', 'imei_child')
                .eq('is_active', true)
                .gt('quantity', 0);
              
              hasChildren = (count || 0) > 0;
              console.log(`🔍 Modal: Single variant has children: ${hasChildren}`);
            } catch (error) {
              console.error('Error checking for children in modal:', error);
            }
          }
          
          if (hasChildren) {
            // Auto-expand single parent variant
            console.log('✅ Modal: Auto-expanding single parent variant');
            const newExpanded = new Set([singleVariant.id]);
            setExpandedParents(newExpanded);
            loadChildVariants(singleVariant.id);
          }
        }
      };
      
      // Run after a short delay to ensure modal is rendered
      setTimeout(() => {
        autoExpandSingleParent();
      }, 100);
    }
  }, [isOpen, product]);

  // Check if variants have children
  const checkForChildren = useCallback(async () => {
    if (!product?.variants) return;
    
    const variantIds = product.variants.map((v: any) => v.id);
    
    try {
      const { data, error } = await supabase
        .from('lats_product_variants')
        .select('parent_variant_id')
        .in('parent_variant_id', variantIds)
        .eq('variant_type', 'imei_child')
        .eq('is_active', true)
        .gt('quantity', 0);

      if (!error && data) {
        const counts: { [key: string]: number } = {};
        data.forEach((child: any) => {
          counts[child.parent_variant_id] = (counts[child.parent_variant_id] || 0) + 1;
        });
        setVariantChildCounts(counts);
        console.log('📊 Variant child counts:', counts);
      }
    } catch (error) {
      console.error('Error checking for children:', error);
    }
  }, [product]);

  // Check for children when modal opens
  useEffect(() => {
    if (isOpen && product?.variants) {
      checkForChildren();
    }
  }, [isOpen, product, checkForChildren]);

  // Debug log all available variants
  useEffect(() => {
    if (isOpen && product) {
      console.log('🎯 Modal opened for product:', product.name);
      console.log('📦 Total variants:', product.variants?.length);
      const availableVariants = product.variants?.filter((v: any) => {
        return v.quantity > 0 && v.is_active !== false;
      }) || [];
      console.log('✅ Available variants:', availableVariants.length);
      console.log('📋 Variant details:', availableVariants);
    }
  }, [isOpen, product]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const availableVariants = product.variants?.filter((v: any) => {
        return v.quantity > 0 && v.is_active !== false;
      }) || [];

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedVariantIndex(prev => 
            Math.min(prev + 1, availableVariants.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedVariantIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (availableVariants[focusedVariantIndex]) {
            const variant = availableVariants[focusedVariantIndex];
            if (isParentVariant(variant)) {
              toggleParentExpansion(variant.id);
            } else {
              handleVariantSelect(variant);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedVariantIndex, product, onClose]);

  if (!isOpen || !product) return null;

  // Check if a variant is a parent variant (has children)
  const isParentVariant = (variant: any): boolean => {
    // Check if explicitly marked as parent
    const markedAsParent = variant.is_parent === true || 
                           variant.variant_type === 'parent' || 
                           variant.variantType === 'parent';
    
    // Check if has children (from our count check)
    const hasChildren = (variantChildCounts[variant.id] || 0) > 0;
    
    const isParent = markedAsParent || hasChildren;
    
    if (hasChildren) {
      console.log(`✅ Variant "${variant.name || variant.variant_name}" has ${variantChildCounts[variant.id]} children`);
    }
    
    return isParent;
  };

  // Load child variants for a parent
  const loadChildVariants = async (parentVariantId: string) => {
    if (childVariants[parentVariantId]) {
      // Already loaded
      return;
    }

    setLoadingChildren(prev => new Set(prev).add(parentVariantId));

    try {
      console.log('🔍 Loading child variants for parent:', parentVariantId);
      
      const { data, error } = await supabase
        .from('lats_product_variants')
        .select('*')
        .eq('parent_variant_id', parentVariantId)
        .eq('variant_type', 'imei_child')
        .eq('is_active', true)
        .gt('quantity', 0)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading child variants:', error);
        throw error;
      }

      console.log('✅ Found child variants:', data?.length || 0, data);

      if (data && data.length > 0) {
        const formattedChildren = data.map(child => {
          // Extract IMEI from various possible locations
          const imei = child.variant_attributes?.imei || 
                       child.variant_attributes?.IMEI ||
                       child.imei ||
                       child.sku ||
                       'N/A';
          
          // Extract serial number
          const serialNumber = child.variant_attributes?.serial_number ||
                              child.variant_attributes?.serialNumber ||
                              child.variant_attributes?.serial ||
                              child.serial_number ||
                              imei;
          
          // Extract condition
          const condition = child.variant_attributes?.condition ||
                           child.condition ||
                           'New';
          
          console.log('📱 Child variant:', {
            id: child.id,
            imei,
            serialNumber,
            condition,
            price: child.selling_price,
            quantity: child.quantity
          });

          return {
            id: child.id,
            name: child.variant_name || `IMEI: ${imei}`,
            sku: child.sku || imei,
            quantity: child.quantity || 0,
            sellingPrice: child.selling_price || child.sellingPrice || child.price || 0,
            imei: imei,
            serialNumber: serialNumber,
            condition: condition,
            variant_attributes: child.variant_attributes,
            is_imei_child: true,
            parent_variant_id: parentVariantId,
            // Pass through all original data for cart
            ...child
          };
        });

        console.log('✅ Formatted children:', formattedChildren);

        setChildVariants(prev => ({
          ...prev,
          [parentVariantId]: formattedChildren
        }));
      } else {
        // No children found
        console.log('⚠️ No child variants found for parent:', parentVariantId);
        setChildVariants(prev => ({
          ...prev,
          [parentVariantId]: []
        }));
      }
    } catch (error) {
      console.error('❌ Error loading child variants:', error);
      toast.error('Failed to load device variants');
      setChildVariants(prev => ({
        ...prev,
        [parentVariantId]: []
      }));
    } finally {
      setLoadingChildren(prev => {
        const newSet = new Set(prev);
        newSet.delete(parentVariantId);
        return newSet;
      });
    }
  };

  // Toggle parent expansion
  const toggleParentExpansion = async (parentVariantId: string) => {
    const newExpanded = new Set(expandedParents);
    
    if (newExpanded.has(parentVariantId)) {
      newExpanded.delete(parentVariantId);
    } else {
      newExpanded.add(parentVariantId);
      // Load children if not already loaded
      if (!childVariants[parentVariantId]) {
        await loadChildVariants(parentVariantId);
      }
    }
    
    setExpandedParents(newExpanded);
  };

  // Handle variant selection
  const handleVariantSelect = (variant: any) => {
    const quantity = selectedQuantities[variant.id] || 1;
    
    // Check if it's a parent with children
    if (isParentVariant(variant)) {
      const children = childVariants[variant.id];
      
      if (!children || children.length === 0) {
        // Parent has no children, treat as regular variant
        onSelectVariant(product, variant, quantity);
        onClose();
      } else {
        // Parent has children, require child selection
        toast.error('Please select a specific device from the list');
        // Expand the parent if not already expanded
        if (!expandedParents.has(variant.id)) {
          toggleParentExpansion(variant.id);
        }
      }
    } else {
      // Regular variant or child variant
      onSelectVariant(product, variant, quantity);
      onClose();
    }
  };

  // Update quantity for a variant
  const updateQuantity = (variantId: string, delta: number) => {
    setSelectedQuantities(prev => {
      const current = prev[variantId] || 1;
      const newValue = Math.max(1, current + delta);
      return { ...prev, [variantId]: newValue };
    });
  };

  // Filter children by search query
  const filterChildren = (children: any[], parentId: string) => {
    const query = searchQuery[parentId]?.toLowerCase() || '';
    if (!query) return children;

    return children.filter(child => {
      const imei = (child.imei || '').toLowerCase();
      const serialNumber = (child.serialNumber || '').toLowerCase();
      const condition = (child.condition || '').toLowerCase();
      
      return imei.includes(query) || 
             serialNumber.includes(query) || 
             condition.includes(query);
    });
  };

  // Get condition badge color
  const getConditionColor = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case 'new':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'used':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'refurbished':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Filter out inactive variants and those with no stock
  const availableVariants = product.variants?.filter((v: any) => {
    return v.quantity > 0 && v.is_active !== false;
  }) || [];

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden pointer-events-auto transform transition-all duration-300 scale-100 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button - Top Right */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-all shadow-lg z-50 hover:scale-110"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header with Gradient */}
          <div className="p-8 text-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-b border-purple-100">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg bg-gradient-to-br from-purple-600 to-blue-600">
              <Package className="w-10 h-10 text-white" />
            </div>
            {/* ✅ Dynamic header: Show "Select Device" for single parent variant */}
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {(() => {
                // Check if single variant that is parent or has children
                if (product?.variants?.length === 1) {
                  const variant = product.variants[0];
                  const isParent = variant.is_parent || variant.variant_type === 'parent';
                  const hasChildrenCount = (variantChildCounts[variant.id] || 0) > 0;
                  
                  if (isParent || hasChildrenCount) {
                    return 'Select Device';
                  }
                }
                return 'Select Variant';
              })()}
            </h2>
            <p className="text-purple-600 font-medium text-lg">{product.name}</p>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-240px)] p-6 bg-gray-50">
            {availableVariants.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
                  <AlertCircle className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Variants Available</h3>
                <p className="text-gray-600 text-lg">This product has no available variants in stock.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableVariants.map((variant: any, index: number) => {
                  const isParent = isParentVariant(variant);
                  const isExpanded = expandedParents.has(variant.id);
                  const children = childVariants[variant.id] || [];
                  const isLoadingChild = loadingChildren.has(variant.id);
                  const quantity = selectedQuantities[variant.id] || 1;
                  const hasLoadedChildren = childVariants[variant.id] !== undefined;
                  const childCount = variantChildCounts[variant.id] || 0;
                  const isFocused = index === focusedVariantIndex;
                  const filteredChildren = filterChildren(children, variant.id);
                  // ✅ Check if single parent variant with children - hide parent, show only devices
                  const isSingleParentVariant = availableVariants.length === 1 && isParent;
                  const shouldShowOnlyChildren = isSingleParentVariant && hasLoadedChildren && children.length > 0;

                  return (
                    <div 
                      key={variant.id} 
                      className={`bg-white rounded-2xl overflow-hidden transition-all shadow-lg ${
                        isFocused 
                          ? 'ring-4 ring-purple-300 shadow-2xl scale-[1.02]' 
                          : 'hover:shadow-xl hover:scale-[1.01]'
                      }`}
                    >
                      {/* Parent/Regular Variant Card - Hide if single parent with children */}
                      {!shouldShowOnlyChildren && (
                      <div 
                        className={`p-6 ${isParent ? 'bg-gradient-to-br from-purple-100 via-purple-50 to-blue-100' : 'bg-gradient-to-br from-white to-gray-50'}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-2xl font-bold text-gray-900">
                                {variant.name || variant.variant_name || 'Unnamed Variant'}
                              </h3>
                              
                              {isParent && (
                                <span className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-bold rounded-full shadow-lg">
                                  {childCount} {childCount === 1 ? 'device' : 'devices'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-6 text-base text-gray-600">
                              {variant.sku && (
                                <div className="flex items-center gap-2 bg-white/70 px-3 py-1.5 rounded-lg">
                                  <Tag className="w-4 h-4 text-purple-600" />
                                  <span className="font-medium">{variant.sku}</span>
                                </div>
                              )}
                              <div className="font-bold text-green-600 text-2xl">
                                {format.currency(variant.sellingPrice || variant.selling_price || 0)}
                              </div>
                              {!isParent && (
                                <div className="text-gray-600 font-medium">
                                  Stock: <span className="font-bold text-blue-600">{variant.quantity || 0}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isParent && (
                              <div className="flex items-center gap-2 bg-white border-2 border-gray-200 rounded-lg px-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(variant.id, -1);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
                                  disabled={quantity <= 1}
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-semibold">{quantity}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(variant.id, 1);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
                                  disabled={quantity >= (variant.quantity || 0)}
                                >
                                  +
                                </button>
                              </div>
                            )}

                            {isParent ? (
                              <button
                                onClick={() => toggleParentExpansion(variant.id)}
                                className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 text-base hover:scale-105"
                              >
                                {isExpanded ? (
                                  <>
                                    Hide Devices
                                    <ChevronUp className="w-5 h-5" />
                                  </>
                                ) : (
                                  <>
                                    Show Devices
                                    <ChevronDown className="w-5 h-5" />
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleVariantSelect(variant)}
                                className="px-8 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl text-base hover:scale-105"
                              >
                                Add to Cart
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      )}

                      {/* Child Variants (IMEI devices) - Show if expanded OR if single parent */}
                      {isParent && (isExpanded || shouldShowOnlyChildren) && (
                        <div className={`bg-gradient-to-br from-purple-50 to-blue-50 p-6 ${shouldShowOnlyChildren ? '' : 'border-t-2 border-purple-200'}`}>
                          {isLoadingChild ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                              <p className="text-gray-600 mt-2">Loading devices...</p>
                            </div>
                          ) : children.length === 0 ? (
                            <div className="text-center py-8">
                              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-600">No specific devices available</p>
                              <button
                                onClick={() => handleVariantSelect(variant)}
                                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                              >
                                Add Parent Variant
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between mb-4 gap-3">
                                <h4 className="text-lg font-bold text-gray-900">
                                  📱 Available Devices ({filteredChildren.length}{children.length !== filteredChildren.length ? ` of ${children.length}` : ''})
                                </h4>
                                
                                {/* Search box for devices */}
                                {children.length > 3 && (
                                  <div className="relative flex-1 max-w-sm">
                                    <input
                                      type="text"
                                      placeholder="🔍 Search IMEI, S/N..."
                                      value={searchQuery[variant.id] || ''}
                                      onChange={(e) => setSearchQuery(prev => ({
                                        ...prev,
                                        [variant.id]: e.target.value
                                      }))}
                                      className="w-full px-4 py-2.5 text-sm border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm font-medium"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    {searchQuery[variant.id] && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSearchQuery(prev => ({
                                            ...prev,
                                            [variant.id]: ''
                                          }));
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {filteredChildren.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm">No devices match your search</p>
                                  <button
                                    onClick={() => setSearchQuery(prev => ({
                                      ...prev,
                                      [variant.id]: ''
                                    }))}
                                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                  >
                                    Clear search
                                  </button>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {filteredChildren.map((child: any, childIndex: number) => {
                                  const isChildFocused = focusedChildIndex[variant.id] === childIndex;
                                  
                                  return (
                                    <div
                                      key={child.id}
                                      className={`p-4 rounded-xl transition-all bg-white cursor-pointer group relative overflow-hidden ${
                                        isChildFocused
                                          ? 'ring-4 ring-green-400 shadow-2xl scale-105'
                                          : 'shadow-md hover:shadow-xl hover:scale-[1.02] border-2 border-gray-200 hover:border-green-400'
                                      }`}
                                      onClick={() => handleVariantSelect(child)}
                                      title={`Click to select ${child.imei}`}
                                    >
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                                          <Package className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <span className="font-mono text-base font-bold text-gray-900 truncate">
                                          {child.imei}
                                        </span>
                                      </div>
                                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                        <svg 
                                          xmlns="http://www.w3.org/2000/svg" 
                                          width="24" 
                                          height="24" 
                                          viewBox="0 0 24 24" 
                                          fill="none" 
                                          stroke="currentColor" 
                                          strokeWidth="3" 
                                          strokeLinecap="round" 
                                          strokeLinejoin="round" 
                                          className="w-5 h-5 text-green-600"
                                        >
                                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                        </svg>
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      {child.serialNumber && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                                          <Tag className="w-4 h-4 text-purple-600" />
                                          <span className="truncate font-medium">S/N: {child.serialNumber}</span>
                                        </div>
                                      )}
                                      
                                      <div className="flex items-center justify-between pt-2 mt-2 border-t-2 border-gray-100">
                                        <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${getConditionColor(child.condition)}`}>
                                          {child.condition}
                                        </span>
                                        <span className="text-lg font-bold text-green-600">
                                          {format.currency(child.sellingPrice)}
                                        </span>
                                      </div>
                                      </div>
                                      
                                      {/* Hover tooltip with additional info */}
                                      <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg" />
                                    </div>
                                  );
                                })}
                              </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Keyboard shortcuts hint */}
            <div className="mt-6 pt-6 border-t-2 border-purple-100">
              <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <kbd className="px-3 py-2 bg-white rounded-lg border-2 border-purple-200 shadow-sm font-bold text-purple-700">↑↓</kbd>
                  <span className="font-medium">Navigate</span>
                </span>
                <span className="flex items-center gap-2">
                  <kbd className="px-3 py-2 bg-white rounded-lg border-2 border-green-200 shadow-sm font-bold text-green-700">Enter</kbd>
                  <span className="font-medium">Select</span>
                </span>
                <span className="flex items-center gap-2">
                  <kbd className="px-3 py-2 bg-white rounded-lg border-2 border-red-200 shadow-sm font-bold text-red-700">Esc</kbd>
                  <span className="font-medium">Close</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default VariantSelectionModal;

