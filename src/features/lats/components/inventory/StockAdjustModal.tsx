import React, { useState, useEffect } from 'react';
import { X, Package, Plus, Minus, Trash2, TrendingUp, TrendingDown, Settings, CheckCircle2, AlertCircle, QrCode, Smartphone, Check, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';
import { addIMEIToParentVariant, checkIMEIExists } from '../../lib/imeiVariantService';
import { getLatsProvider } from '../../lib/data/provider';

interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  variant_name?: string;
  selling_price: number;
  cost_price: number;
  quantity: number;
  min_quantity: number;
  max_quantity?: number;
  is_parent?: boolean;
  variant_type?: string;
  variant_attributes?: any;
}

interface StockAdjustmentData {
  adjustmentType: 'in' | 'out' | 'set';
  quantity: number;
  reason: string;
  notes?: string;
  imeis?: string[]; // IMEI/Serial numbers to add as child variants
}

interface StockAdjustModalProps {
  variant?: ProductVariant;
  isOpen: boolean;
  onClose?: () => void;
  onSubmit?: (data: StockAdjustmentData) => Promise<void>;
  loading?: boolean;
}

const REASON_OPTIONS = [
  { value: 'purchase', label: 'Purchase Order' },
  { value: 'sale', label: 'Sale' },
  { value: 'return', label: 'Customer Return' },
  { value: 'damage', label: 'Damaged Goods' },
  { value: 'expiry', label: 'Expired Goods' },
  { value: 'theft', label: 'Theft/Loss' },
  { value: 'adjustment', label: 'Manual Adjustment' },
  { value: 'transfer', label: 'Location Transfer' },
  { value: 'audit', label: 'Stock Audit' },
  { value: 'other', label: 'Other' }
];

const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  variant,
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [adjustmentType, setAdjustmentType] = useState<'in' | 'out' | 'set'>('in');
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [imeis, setImeis] = useState<string[]>(['']);
  const [useChildrenVariants, setUseChildrenVariants] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dataProvider = getLatsProvider();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && variant) {
      setAdjustmentType('in');
      setQuantity(0);
      setReason('');
      setNotes('');
      setImeis(['']);
      setUseChildrenVariants(false);
    }
  }, [isOpen, variant]);

  // Sync IMEI fields with quantity when quantity changes, adjustment type is 'in', and toggle is enabled
  useEffect(() => {
    if (adjustmentType === 'in' && quantity > 0 && useChildrenVariants) {
      setImeis(prevImeis => {
        const newImeis = Array(quantity).fill('').map((_, index) => prevImeis[index] || '');
        return newImeis;
      });
    } else if (adjustmentType !== 'in' || !useChildrenVariants) {
      // Clear IMEIs when not stock in or toggle is disabled
      setImeis(['']);
      if (adjustmentType !== 'in') {
        setUseChildrenVariants(false);
      }
    }
  }, [quantity, adjustmentType, useChildrenVariants]);

  // Calculate new stock level
  const getNewStockLevel = (): number => {
    if (!variant) return 0;
    const currentStock = variant.quantity || 0;
    switch (adjustmentType) {
      case 'in':
        return currentStock + quantity;
      case 'out':
        return Math.max(0, currentStock - quantity);
      case 'set':
        return quantity;
      default:
        return currentStock;
    }
  };

  const newStockLevel = getNewStockLevel();

  // Get stock status
  const getStockStatus = (stock: number): 'low' | 'normal' | 'high' => {
    if (!variant) return 'normal';
    if (stock <= (variant.min_quantity || 0)) return 'low';
    if (variant.max_quantity && stock >= variant.max_quantity) return 'high';
    return 'normal';
  };

  const currentStatus = getStockStatus(variant?.quantity || 0);
  const newStatus = getStockStatus(newStockLevel);

  // Format price
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  // Update IMEI value
  const updateIMEI = (index: number, value: string) => {
    const newImeis = [...imeis];
    newImeis[index] = value;
    setImeis(newImeis);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!variant) return;

    // Validation
    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    // Validate IMEIs if adding stock - OPTIONAL: only validate if toggle is enabled and IMEIs are provided
    const validImeis = imeis.filter(imei => imei.trim().length > 0);
    if (adjustmentType === 'in' && quantity > 0 && useChildrenVariants && validImeis.length > 0) {
      // If IMEIs are provided, they must match the quantity
      if (validImeis.length !== quantity) {
        toast.error(`If providing IMEI/Serial numbers, please enter one for each of the ${quantity} unit(s)`);
        return;
      }
      
      // Check for duplicate IMEIs in the current input
      const uniqueImeis = new Set(validImeis.map(imei => imei.trim()));
      if (uniqueImeis.size !== validImeis.length) {
        toast.error('Duplicate IMEI/Serial numbers detected. Each unit must have a unique identifier.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      const currentBranchId = getCurrentBranchId();

      // If adding IMEIs as child variants (only if toggle is enabled)
      if (adjustmentType === 'in' && useChildrenVariants && validImeis.length > 0) {
        // Check if variant is a parent or needs to be converted
        let parentVariantId = variant.id;
        
        // If variant is not a parent, convert it
        if (!variant.is_parent && variant.variant_type !== 'parent') {
          const { error: convertError } = await supabase
            .from('lats_product_variants')
            .update({
              is_parent: true,
              variant_type: 'parent',
              updated_at: new Date().toISOString()
            })
            .eq('id', variant.id);

          if (convertError) {
            console.error('Error converting variant to parent:', convertError);
          }
        }

        // Add each IMEI as a child variant
        const imeiResults = [];
        for (const imei of validImeis) {
          const trimmedImei = imei.trim();
          if (!trimmedImei) continue;

          // Check if IMEI already exists
          const exists = await checkIMEIExists(trimmedImei);
          if (exists) {
            toast.error(`IMEI ${trimmedImei} already exists in system`);
            continue;
          }

          // Add IMEI to parent variant
          const result = await addIMEIToParentVariant(parentVariantId, {
            imei: trimmedImei,
            serial_number: trimmedImei, // Unified system
            cost_price: variant.cost_price || 0,
            selling_price: variant.selling_price || 0,
            condition: 'new',
            source: 'purchase'
          });

          if (result.success) {
            imeiResults.push(trimmedImei);
          } else {
            toast.error(`Failed to add IMEI ${trimmedImei}: ${result.error}`);
          }
        }

        if (imeiResults.length > 0) {
          toast.success(`Added ${imeiResults.length} IMEI/Serial number(s) as child variants`);
        }
      }

      // Create stock movement record
      const movementQuantity = adjustmentType === 'out' ? -quantity : 
                               adjustmentType === 'set' ? (newStockLevel - (variant.quantity || 0)) : quantity;

      const { error: movementError } = await supabase
        .from('lats_stock_movements')
        .insert({
          product_id: variant.product_id,
          variant_id: variant.id,
          movement_type: adjustmentType === 'set' ? 'adjustment' : adjustmentType,
          quantity: movementQuantity,
          reason: reason,
          notes: notes || `Stock ${adjustmentType === 'in' ? 'added' : adjustmentType === 'out' ? 'removed' : 'set'}`,
          created_by: userId,
          created_at: new Date().toISOString()
        });

      if (movementError) {
        console.error('Error creating stock movement:', movementError);
        toast.error('Failed to record stock movement');
      }

      // Call custom onSubmit if provided
      if (onSubmit) {
        await onSubmit({
          adjustmentType,
          quantity,
          reason,
          notes,
          imeis: validImeis
        });
      }

      // Check for low stock and send WhatsApp notifications (non-blocking)
      try {
        const { inventoryNotificationService } = await import('../../../../services/inventoryNotificationService');
        const result = await inventoryNotificationService.sendLowStockNotification(variant.id);
        if (result.success && result.sent) {
          console.log(`📱 Low stock notification sent for ${variant.id}`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to check/send low stock notification:', error);
      }

      toast.success('Stock adjustment completed successfully');
        onClose?.();
    } catch (error) {
      console.error('Stock adjustment error:', error);
      toast.error('Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !variant) return null;

  const isDirty = quantity > 0 && reason.length > 0;

  return (
      <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" 
      role="dialog" 
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

          {/* Header */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
            
            {/* Title and Info */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Adjust Stock Level</h3>
              <p className="text-sm text-gray-600">
                {variant.name || variant.variant_name || 'Variant'} ({variant.sku})
              </p>
            </div>
          </div>
          </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Current Stock Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Current Stock</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{variant.quantity || 0}</div>
                <div className="text-xs text-gray-600 mt-1">Current Stock</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-700">{variant.min_quantity || 0}</div>
                <div className="text-xs text-gray-600 mt-1">Min Level</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-700">{variant.max_quantity || 'N/A'}</div>
                <div className="text-xs text-gray-600 mt-1">Max Level</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-700">{formatPrice(variant.selling_price || 0)}</div>
                <div className="text-xs text-gray-600 mt-1">Unit Price</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-4">
              {currentStatus === 'low' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                  <AlertCircle className="w-3 h-3" />
                  Low Stock
                </span>
              )}
              {currentStatus === 'high' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                  <AlertCircle className="w-3 h-3" />
                  Overstocked
                </span>
              )}
              {currentStatus === 'normal' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Normal
                </span>
              )}
            </div>
          </div>

          {/* Adjustment Details */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-gray-900">Adjustment Details</h4>
            
              {/* Adjustment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adjustment Type *
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustmentType('in')}
                  className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
                    adjustmentType === 'in'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                  }`}
                >
                  <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                  Stock In
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('out')}
                  className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
                    adjustmentType === 'out'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
                  }`}
                >
                  <TrendingDown className="w-5 h-5 mx-auto mb-1" />
                  Stock Out
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('set')}
                  className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
                    adjustmentType === 'set'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  <Settings className="w-5 h-5 mx-auto mb-1" />
                  Set Stock
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(0.01, (quantity || 0) - 1))}
                  className="w-12 h-12 flex items-center justify-center border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-gray-700 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={quantity <= 0.01}
                >
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  type="number"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  min={0.01}
                  step={0.01}
                  placeholder="0"
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-xl font-bold bg-white text-center"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((quantity || 0) + 1)}
                  className="w-12 h-12 flex items-center justify-center border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-gray-700 hover:text-blue-700"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {adjustmentType === 'set' 
                  ? 'Set stock to this quantity'
                  : adjustmentType === 'in'
                  ? 'Add to current stock'
                  : 'Remove from current stock'}
              </p>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
              >
                <option value="">Select reason</option>
                {REASON_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                  placeholder="Additional notes about this adjustment"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white resize-none"
            />
          </div>

            {/* IMEI/Serial Number Section - Only for Stock In (Optional with Toggle) */}
            {adjustmentType === 'in' && quantity > 0 && (
              <div className="border-2 border-indigo-200 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-purple-50/50 overflow-hidden shadow-sm">
                {/* Header Toggle */}
                <div 
                  className="p-4 cursor-pointer hover:bg-indigo-100/50 transition-colors"
                  onClick={() => {
                    const newValue = !useChildrenVariants;
                    setUseChildrenVariants(newValue);
                    if (newValue && imeis.length === 0) {
                      setImeis(Array(quantity).fill(''));
                    } else if (!newValue) {
                      setImeis(['']);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        useChildrenVariants 
                          ? 'bg-indigo-600 shadow-lg shadow-indigo-200' 
                          : 'bg-gray-200'
                      }`}>
                        <Smartphone className={`w-5 h-5 ${
                          useChildrenVariants ? 'text-white' : 'text-gray-500'
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
                      {useChildrenVariants && imeis.filter(i => i.trim()).length > 0 && (
                        <div className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-md">
                          {imeis.filter(i => i.trim()).length} item{imeis.filter(i => i.trim()).length !== 1 ? 's' : ''}
                        </div>
                      )}
                      <div className={`w-12 h-6 rounded-full transition-all duration-300 ${
                        useChildrenVariants ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 mt-0.5 ${
                          useChildrenVariants ? 'translate-x-6' : 'translate-x-0.5'
                        }`} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Fields - Only show when toggle is enabled */}
                {useChildrenVariants && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {imeis.map((imei, index) => (
                        <div 
                          key={index} 
                          className="group relative flex items-center gap-2 p-2 bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 transition-all shadow-sm hover:shadow-md"
                        >
                          <div className="w-8 h-8 flex items-center justify-center bg-indigo-100 rounded-lg text-xs font-bold text-indigo-700 flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 relative">
                            <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={imei}
                              onChange={(e) => updateIMEI(index, e.target.value)}
                              placeholder={`Enter IMEI or Serial #${index + 1}`}
                              className="w-full pl-10 pr-10 py-2.5 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 bg-transparent font-medium"
                            />
                            {imei.trim() && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <Check className="w-4 h-4 text-green-500" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Info Box */}
                    <div className="flex items-start gap-2 p-3 bg-indigo-100/50 rounded-xl border border-indigo-200">
                      <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Info className="w-3 h-3 text-white" />
                      </div>
                      <p className="text-xs text-indigo-800 leading-relaxed">
                        Each IMEI/Serial number will be created as a child variant. Stock quantity will be automatically calculated from the number of items added.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Preview */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Preview</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Current Stock</div>
                  <div className="text-2xl font-bold text-gray-900">{variant.quantity || 0}</div>
                  {currentStatus === 'low' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 mt-2">
                      Low
                    </span>
                  )}
                  {currentStatus === 'high' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 mt-2">
                      High
                    </span>
                  )}
                  {currentStatus === 'normal' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 mt-2">
                      Normal
                    </span>
                  )}
                </div>
                <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">New Stock</div>
                  <div className="text-2xl font-bold text-gray-900">{newStockLevel}</div>
                  {newStatus === 'low' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 mt-2">
                      Low
                    </span>
                  )}
                  {newStatus === 'high' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 mt-2">
                      High
                    </span>
                  )}
                  {newStatus === 'normal' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 mt-2">
                      Normal
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200">
                {adjustmentType === 'in' && (
                  <span className="text-sm font-semibold text-green-700">
                    +{quantity} units
                  </span>
                )}
                {adjustmentType === 'out' && (
                  <span className="text-sm font-semibold text-red-700">
                    -{quantity} units
                  </span>
                )}
                {adjustmentType === 'set' && (
                  <span className="text-sm font-semibold text-blue-700">
                    Set to {quantity} units
                  </span>
                )}
              </div>
            </div>
            </div>
          </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isDirty || isSubmitting || loading}
              className="flex-1 px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
            >
              {isSubmitting || loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                'Apply Adjustment'
              )}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || loading}
              className="flex-1 sm:flex-none px-6 py-3.5 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

StockAdjustModal.displayName = 'StockAdjustModal';

export default StockAdjustModal;
