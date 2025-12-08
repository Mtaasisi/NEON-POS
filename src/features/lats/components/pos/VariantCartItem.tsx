import React, { useState, useEffect } from 'react';
import { Trash2, Package, Tag, Minus, Plus, Edit, X, AlertTriangle } from 'lucide-react';
import GlassCard from '../../../shared/components/ui/GlassCard';
import GlassButton from '../../../shared/components/ui/GlassButton';
import GlassBadge from '../../../shared/components/ui/GlassBadge';
import { format } from '../../lib/format';
import { CartItem } from '../../types/pos';
import { SafeImage } from '../../../../components/SafeImage';
import { ProductImage } from '../../../../lib/robustImageService';
import { getSpecificationIcon, getSpecificationTooltip, formatSpecificationValue } from '../../lib/specificationUtils';
import { usePOSClickSounds } from '../../hooks/usePOSClickSounds';
import { supabase } from '../../../../lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface VariantCartItemProps {
  item: CartItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onVariantChange?: (variantId: string) => void;
  onTagsChange?: (tags: string[]) => void;
  onIMEISelect?: (item: CartItem) => void; // Callback to handle IMEI selection
  availableVariants?: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
    attributes: Record<string, string>;
  }>;
  showStockInfo?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
  autoExpand?: boolean; // Auto-expand this item (e.g., for newly added items)
  isExpanded?: boolean; // Whether this item is expanded (controlled by parent)
  onToggleExpand?: (itemId: string) => void; // Callback to toggle expansion
}

// Helper function to convert old image format to new format
const convertToProductImages = (imageUrls: string[]): ProductImage[] => {
  if (!imageUrls || imageUrls.length === 0) return [];
  
  return imageUrls.map((imageUrl, index) => ({
    id: `temp-${index}`,
    url: imageUrl,
    thumbnailUrl: imageUrl,
    fileName: `product-image-${index + 1}`,
    fileSize: 0,
    isPrimary: index === 0,
    uploadedAt: new Date().toISOString()
  }));
};

const VariantCartItem: React.FC<VariantCartItemProps> = ({
  item,
  onQuantityChange,
  onRemove,
  onVariantChange,
  onTagsChange,
  onIMEISelect,
  availableVariants = [],
  showStockInfo = true,
  variant = 'default',
  className = '',
  autoExpand = false,
  isExpanded: controlledIsExpanded,
  onToggleExpand
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editQuantity, setEditQuantity] = useState(item.quantity);
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [requiresIMEI, setRequiresIMEI] = useState(false);
  const [checkingIMEI, setCheckingIMEI] = useState(false);
  const [internalIsExpanded, setInternalIsExpanded] = useState(autoExpand);
  const [productImage, setProductImage] = useState<string | null>(item.image || null);
  const { playClickSound, playDeleteSound } = usePOSClickSounds();

  // Use controlled state if provided, otherwise use internal state
  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : internalIsExpanded;

  // Auto-expand on mount if autoExpand prop is true
  useEffect(() => {
    if (autoExpand && variant === 'compact' && controlledIsExpanded === undefined) {
      setInternalIsExpanded(true);
      // If parent provides toggle callback, notify it
      if (onToggleExpand) {
        onToggleExpand(item.id);
      }
    }
  }, [autoExpand, variant, item.id, controlledIsExpanded, onToggleExpand]);

  // Handle toggle expand
  const handleToggleExpand = () => {
    if (onToggleExpand) {
      // Controlled mode - let parent handle it
      onToggleExpand(item.id);
    } else {
      // Uncontrolled mode - handle internally
      setInternalIsExpanded(!internalIsExpanded);
    }
  };

  // Calculate totals
  const subtotal = item.unitPrice * item.quantity;
  const availableStock = item.availableQuantity;

  // Get stock status
  const getStockStatus = () => {
    if (item.quantity > availableStock) return 'insufficient';
    if (availableStock <= 5) return 'low';
    return 'normal';
  };

  const stockStatus = getStockStatus();

  // Check if this item requires IMEI selection
  React.useEffect(() => {
    const checkIMEIRequirement = async () => {
      if (item.selectedSerialNumbers && item.selectedSerialNumbers.length > 0) {
        setRequiresIMEI(false);
        return;
      }

      setCheckingIMEI(true);
      try {
        // First check if this specific variant has IMEI children
        let hasIMEIChildren = false;

        if (item.variantId && item.variantId !== 'default') {
          // Check if this variant has IMEI child variants
          const { count } = await supabase
            .from('lats_product_variants')
            .select('id', { count: 'exact', head: true })
            .eq('parent_variant_id', item.variantId)
            .eq('variant_type', 'imei_child')
            .eq('is_active', true)
            .gt('quantity', 0);

          hasIMEIChildren = (count || 0) > 0;

          if (hasIMEIChildren) {
            // Variant has IMEI children, requires IMEI selection
            setRequiresIMEI(true);
            setCheckingIMEI(false);
            return;
          } else {
            // Check if this variant itself is an IMEI variant
            const { data: variant } = await supabase
              .from('lats_product_variants')
              .select('variant_attributes')
              .eq('id', item.variantId)
              .eq('is_active', true)
              .single();

            // If it's an IMEI variant OR has no IMEI children and is not IMEI, no selection needed
            setRequiresIMEI(false);
            setCheckingIMEI(false);
            return;
          }
        }

        // No specific variant selected (default variant) - check product level
        const { data: imeiVariants } = await supabase
          .from('lats_product_variants')
          .select('id')
          .eq('product_id', item.productId)
          .not("variant_attributes->>'imei'", 'is', null)
          .eq('is_active', true)
          .gt('quantity', 0)
          .limit(1);

        setRequiresIMEI(imeiVariants && imeiVariants.length > 0);

      } catch (error) {
        console.error('Error checking IMEI requirement:', error);
        setRequiresIMEI(false);
      } finally {
        setCheckingIMEI(false);
      }
    };

    checkIMEIRequirement();
  }, [item.productId, item.variantId, item.selectedSerialNumbers]);

  // Get stock status badge
  const getStockStatusBadge = () => {
    switch (stockStatus) {
      case 'insufficient':
        return <GlassBadge variant="error" size="sm">Insufficient Stock</GlassBadge>;
      case 'low':
        return <GlassBadge variant="warning" size="sm">Low Stock</GlassBadge>;
      default:
        return <GlassBadge variant="success" size="sm">In Stock</GlassBadge>;
    }
  };

  // Handle quantity change
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity <= 0) {
      onRemove();
    } else {
      onQuantityChange(newQuantity);
    }
  };

  // Handle quantity input
  const handleQuantityInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setEditQuantity(value);
  };

  // Handle quantity input submit
  const handleQuantitySubmit = () => {
    handleQuantityChange(editQuantity);
    setIsEditing(false);
  };

  // Handle quantity input cancel
  const handleQuantityCancel = () => {
    setEditQuantity(item.quantity);
    setIsEditing(false);
  };

  // Handle variant selection
  const handleVariantSelect = (variantId: string) => {
    if (onVariantChange) {
      onVariantChange(variantId);
    }
    setShowVariantSelector(false);
  };

  // Handle tag addition
  const handleAddTag = () => {
    if (newTag.trim() && onTagsChange) {
      const currentTags = item.tags || [];
      if (!currentTags.includes(newTag.trim())) {
        onTagsChange([...currentTags, newTag.trim()]);
        playClickSound();
      }
      setNewTag('');
      setShowTagInput(false);
    }
  };

  // Handle tag removal
  const handleRemoveTag = (tagToRemove: string) => {
    if (onTagsChange) {
      const currentTags = item.tags || [];
      onTagsChange(currentTags.filter(tag => tag !== tagToRemove));
      playClickSound();
    }
  };

  // Check if item has variant attributes
  const hasVariantAttributes = availableVariants.length > 1;

  // Fetch product image from database (same as products do)
  useEffect(() => {
    const fetchProductImage = async () => {
      // If we already have an image, use it
      if (item.image) {
        setProductImage(item.image);
        return;
      }

      // Otherwise, fetch from database
      try {
        // First try to get image from product_images table (preferred)
        const { data: productImages, error: imagesError } = await supabase
          .from('product_images')
          .select('image_url, thumbnail_url, is_primary')
          .eq('product_id', item.productId)
          .order('is_primary', { ascending: false })
          .limit(1);

        if (!imagesError && productImages && productImages.length > 0) {
          const firstImage = productImages[0];
          const imageUrl = firstImage.thumbnail_url || firstImage.image_url;
          if (imageUrl) {
            setProductImage(imageUrl);
            return;
          }
        }

        // Fallback to image_url from lats_products table
        // Note: lats_products table only has image_url, not thumbnail_url
        const { data: product, error } = await supabase
          .from('lats_products')
          .select('image_url')
          .eq('id', item.productId)
          .single();

        if (error) {
          // Don't log error if product_images query failed and this also fails
          if (!imagesError) {
            console.error('Error fetching product image:', error);
          }
          return;
        }

        if (product) {
          const extractedImage = product.image_url;
          if (extractedImage) {
            setProductImage(extractedImage);
          }
        }
      } catch (error) {
        console.error('Error fetching product image:', error);
      }
    };

    fetchProductImage();
  }, [item.productId, item.image]);

  // Get product thumbnail
  const getProductThumbnail = () => {
    return productImage;
  };

  const thumbnail = getProductThumbnail();

  if (variant === 'compact') {
    return (
      <div className={`bg-white border-2 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 ${className} ${
        isExpanded
          ? 'border-blue-500 shadow-xl'
          : stockStatus === 'insufficient' 
            ? 'border-red-300' 
            : stockStatus === 'low'
              ? 'border-orange-300'
              : 'border-gray-200 hover:border-gray-300'
      }`}>
        {/* Item Header - Clickable */}
        <div 
          className="flex items-start justify-between p-4 cursor-pointer"
          onClick={handleToggleExpand}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              {/* Chevron Icon - Styled like SetPricingModal */}
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
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
              
              {/* Product Icon - Styled like SetPricingModal */}
              {thumbnail ? (
                <div className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <SafeImage
                    src={thumbnail}
                    alt={item.productName}
                    className="w-full h-full rounded-md"
                    fallbackText={item.productName.charAt(0).toUpperCase()}
                  />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-white" />
                </div>
              )}
              
              {/* Product Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate text-base flex-1 min-w-0 max-w-full">
                    {item.productName}
                  </h3>
                </div>
                {item.variantName !== 'Default' && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                    <span className="text-blue-600 font-semibold">{item.variantName}</span>
                  </div>
                )}
                {/* Total Price - Show when collapsed, below variant name - Simple */}
                {!isExpanded && (
                  <p className="text-2xl font-bold text-gray-900 mt-1.5">
                    {format.money(subtotal)}
                  </p>
                )}
                {/* IMEI Selection Status */}
                {item.selectedSerialNumbers && item.selectedSerialNumbers.length > 0 ? (
                  <div className="flex items-center gap-1 text-xs text-green-600 mt-1 font-medium">
                    <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    <span>IMEI: {item.selectedSerialNumbers.map((sn: any) => sn.imei || sn.serial_number).join(', ')}</span>
                  </div>
                ) : requiresIMEI ? (
                  <div className="flex items-center gap-2 mt-1">
                    <GlassBadge variant="warning" size="sm" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      IMEI Required
                    </GlassBadge>
                    {onIMEISelect && (
                      <GlassButton
                        onClick={(e) => {
                          e.stopPropagation();
                          onIMEISelect(item);
                        }}
                        variant="primary"
                        size="sm"
                        className="text-xs px-2 py-1"
                      >
                        Select IMEI
                      </GlassButton>
                    )}
                  </div>
                ) : null}
                {/* Product Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Remove Button - Styled like SetPricingModal */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 text-sm font-medium text-white bg-red-500 hover:bg-red-600 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200 shadow-lg"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Expanded Content - Only show when item is expanded */}
        {isExpanded && (
          <div className="px-4 pb-4">
            {/* Price and Quantity Controls - Styled like SetPricingModal */}
            <div>
              <div className="flex flex-col gap-4 w-full">
                {/* Total Price - Styled like SetPricingModal */}
                <div className="w-full">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Total</p>
                  <p className="text-2xl font-bold text-gray-900 truncate">
                    {format.money(subtotal)}
                  </p>
                </div>
                
                {/* Quantity Controls - Styled like SetPricingModal */}
                <div className="w-full">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Quantity</p>
                  <div className="flex items-center gap-2 w-full">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuantityChange(item.quantity - 1);
                      }}
                      disabled={item.quantity <= 1}
                      className="inline-flex items-center justify-center w-12 h-12 text-base font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex-shrink-0"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="flex-1 text-center font-bold text-lg px-4 py-2 bg-white rounded-xl border-2 border-gray-300 shadow-sm">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuantityChange(item.quantity + 1);
                      }}
                      disabled={item.quantity >= availableStock}
                      className="inline-flex items-center justify-center w-12 h-12 text-base font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex-shrink-0"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Stock Warning - Styled like SetPricingModal */}
        {stockStatus === 'insufficient' && (
          <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-red-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold">Warning:</span>
              <span>Requested quantity ({item.quantity}) exceeds available stock ({availableStock})</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 ${className}`}>
      {/* Product Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          {/* Product Thumbnail */}
          {thumbnail ? (
            <div className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden">
              <SafeImage
                src={thumbnail}
                alt={item.productName}
                className="w-full h-full rounded-md"
                fallbackText={item.productName.charAt(0).toUpperCase()}
              />
            </div>
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-md flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate min-w-0 max-w-full">{item.productName}</h3>
            {item.variantName !== 'Default' && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <span className="text-blue-600 font-medium">{item.variantName}</span>
              </div>
            )}
            {/* IMEI Selection Status */}
            {item.selectedSerialNumbers && item.selectedSerialNumbers.length > 0 ? (
              <div className="flex items-center gap-1 text-xs text-green-600 mt-1 font-medium">
                <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                <span>IMEI: {item.selectedSerialNumbers.map((sn: any) => sn.imei || sn.serial_number).join(', ')}</span>
              </div>
            ) : requiresIMEI ? (
              <div className="flex items-center gap-2 mt-2">
                <GlassBadge variant="warning" size="sm">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  IMEI Required
                </GlassBadge>
                {onIMEISelect && (
                  <GlassButton
                    onClick={() => onIMEISelect(item)}
                    variant="primary"
                    size="sm"
                    className="text-xs px-3 py-1"
                  >
                    Select IMEI
                  </GlassButton>
                )}
              </div>
            ) : null}
            {/* Show specifications if available */}
            {item.attributes && Object.keys(item.attributes).length > 0 && (
              <div className="mt-3">
                <div className="space-y-1.5">
                  {Object.entries(item.attributes).slice(0, 6).map(([key, value]) => {
                    const IconComponent = getSpecificationIcon(key);
                    const tooltip = getSpecificationTooltip(key);
                    const formattedValue = formatSpecificationValue(key, value);
                    
                    // Enhanced color scheme with better contrast
                    const getSpecColor = (specKey: string) => {
                      const spec = specKey.toLowerCase();
                      if (spec.includes('ram')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
                      if (spec.includes('storage') || spec.includes('memory')) return 'bg-blue-50 text-blue-800 border-blue-200';
                      if (spec.includes('processor') || spec.includes('cpu')) return 'bg-purple-50 text-purple-800 border-purple-200';
                      if (spec.includes('screen') || spec.includes('display')) return 'bg-orange-50 text-orange-800 border-orange-200';
                      if (spec.includes('battery')) return 'bg-teal-50 text-teal-800 border-teal-200';
                      if (spec.includes('camera')) return 'bg-pink-50 text-pink-800 border-pink-200';
                      if (spec.includes('color')) return 'bg-red-50 text-red-800 border-red-200';
                      if (spec.includes('weight') || spec.includes('size')) return 'bg-gray-50 text-gray-800 border-gray-200';
                      if (spec.includes('charger') || spec.includes('port')) return 'bg-cyan-50 text-cyan-800 border-cyan-200';
                      return 'bg-slate-50 text-slate-800 border-slate-200';
                    };
                    
                    return (
                      <div 
                        key={key} 
                        className={`p-2 rounded-md border ${getSpecColor(key)} hover:shadow-sm transition-all duration-200 cursor-help`}
                        title={tooltip}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {IconComponent && <IconComponent className="w-3.5 h-3.5 flex-shrink-0" />}
                            <div>
                              <div className="text-xs font-medium capitalize text-gray-700">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs font-semibold">
                            {formattedValue}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {Object.keys(item.attributes).length > 6 && (
                  <div className="text-center mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 text-xs font-medium">
                      +{Object.keys(item.attributes).length - 6} more
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {hasVariantAttributes && (
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Tag className="w-3 h-3" />
                <span>Click to change variant</span>
              </div>
            )}
          </div>
        </div>
        {stockStatus === 'insufficient' && getStockStatusBadge()}
      </div>

      {/* Price and Stock Info */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {showStockInfo && (
            <div className="text-sm text-gray-600">
              Available: {availableStock} units
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="font-bold text-2xl text-gray-900">{format.money(subtotal)}</div>
          {hasVariantAttributes && onVariantChange && (
            <button
              onClick={() => setShowVariantSelector(!showVariantSelector)}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Edit className="w-3 h-3" />
              Change Variant
            </button>
          )}
        </div>
      </div>

      {/* Variant Selector */}
      {showVariantSelector && hasVariantAttributes && onVariantChange && (
        <div className="border-t border-gray-200 pt-3 mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Select Variant:</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {availableVariants.map((variant) => {
              const isSelected = variant.id === item.variantId;
              const variantStockStatus = variant.quantity <= 0 ? 'out-of-stock' : 
                                       variant.quantity <= 5 ? 'low' : 'normal';
              
              return (
                <div
                  key={variant.id}
                  className={`p-2 rounded-lg border cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleVariantSelect(variant.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{variant.name}</div>
                      <div className="text-xs text-gray-600 flex items-center gap-2">
                        <span className="font-mono">{variant.sku}</span>
                      </div>
                      
                      {/* Enhanced Specifications Display in Cart */}
                      {Object.entries(variant.attributes).length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(variant.attributes).map(([key, value]) => {
                              // Get color based on specification type
                              const getSpecColor = (specKey: string) => {
                                const spec = specKey.toLowerCase();
                                if (spec.includes('ram')) return 'bg-green-100 text-green-700';
                                if (spec.includes('storage') || spec.includes('memory')) return 'bg-blue-100 text-blue-700';
                                if (spec.includes('processor') || spec.includes('cpu')) return 'bg-purple-100 text-purple-700';
                                if (spec.includes('screen') || spec.includes('display')) return 'bg-orange-100 text-orange-700';
                                if (spec.includes('battery')) return 'bg-teal-100 text-teal-700';
                                if (spec.includes('camera')) return 'bg-pink-100 text-pink-700';
                                if (spec.includes('color')) return 'bg-red-100 text-red-700';
                                if (spec.includes('size')) return 'bg-gray-100 text-gray-700';
                                return 'bg-indigo-100 text-indigo-700';
                              };
                              
                              return (
                                <span key={key} className={`px-2 py-1 rounded text-xs font-medium ${getSpecColor(key)}`}>
                                  {key.replace(/_/g, ' ')}: {value}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">{format.money(variant.sellingPrice)}</div>
                      <div className={`text-xs ${
                        variantStockStatus === 'out-of-stock' ? 'text-red-600' :
                        variantStockStatus === 'low' ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        Stock: {variant.quantity}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Product Tags Section */}
      {onTagsChange && (
        <div className="border-t border-gray-200 pt-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600" />
              Product Tags
            </h4>
            <button
              onClick={() => {
                playClickSound();
                setShowTagInput(!showTagInput);
              }}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              {showTagInput ? 'Cancel' : '+ Add Tag'}
            </button>
          </div>
          
          {/* Existing Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {item.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200 hover:shadow-sm transition-all"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {/* Tag Input */}
          {showTagInput && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Enter tag name..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Add
              </button>
            </div>
          )}
          
          {(!item.tags || item.tags.length === 0) && !showTagInput && (
            <p className="text-xs text-gray-500 italic">No tags added yet</p>
          )}
        </div>
      )}

      {/* Quantity Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700">Quantity:</label>
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max={availableStock}
                value={editQuantity}
                onChange={handleQuantityInput}
                className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <button
                onClick={handleQuantitySubmit}
                disabled={editQuantity <= 0 || editQuantity > availableStock}
                className="inline-flex items-center justify-center w-8 h-8 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓
              </button>
              <button
                onClick={handleQuantityCancel}
                className="inline-flex items-center justify-center w-8 h-8 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  playClickSound();
                  handleQuantityChange(item.quantity - 1);
                }}
                disabled={item.quantity <= 1}
                className="inline-flex items-center justify-center w-10 h-10 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span 
                className="w-16 text-center font-semibold text-lg cursor-pointer hover:bg-gray-100 px-3 py-2 rounded-lg border border-gray-200"
                onClick={() => {
                  playClickSound();
                  setIsEditing(true);
                }}
              >
                {item.quantity}
              </span>
              <button
                onClick={() => {
                  playClickSound();
                  handleQuantityChange(item.quantity + 1);
                }}
                disabled={item.quantity >= availableStock}
                className="inline-flex items-center justify-center w-10 h-10 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={() => {
            playDeleteSound();
            onRemove();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200"
        >
          <Trash2 className="w-4 h-4" />
          Remove
        </button>
      </div>

      {/* Stock Warning */}
      {stockStatus === 'insufficient' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-800">
            <strong>Warning:</strong> Requested quantity ({item.quantity}) exceeds available stock ({availableStock})
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantCartItem;

