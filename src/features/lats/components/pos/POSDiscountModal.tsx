import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import GlassCard from '../../../../features/shared/components/ui/GlassCard';
import { DollarSign, Percent, X, Keyboard, Tag, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import VirtualNumberKeyboard from './VirtualNumberKeyboard';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';

interface POSDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDiscount: (type: string, value: string) => void;
  onClearDiscount: () => void;
  currentTotal: number;
  hasExistingDiscount?: boolean;
}

const POSDiscountModal: React.FC<POSDiscountModalProps> = ({
  isOpen,
  onClose,
  onApplyDiscount,
  onClearDiscount,
  currentTotal,
  hasExistingDiscount = false
}) => {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [discountValue, setDiscountValue] = useState('');

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumberWithCommas = (value: string) => {
    if (!value) return '';
    // Remove any existing commas
    const number = value.replace(/,/g, '');
    // Add commas as thousand separators
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const calculateDiscountAmount = () => {
    if (!discountValue) return 0;
    // Remove commas before parsing
    const cleanValue = discountValue.replace(/,/g, '');
    const value = parseFloat(cleanValue);
    if (isNaN(value)) return 0;
    
    if (discountType === 'percentage') {
      return (currentTotal * value) / 100;
    } else {
      return value;
    }
  };

  const discountAmount = calculateDiscountAmount();
  const finalTotal = currentTotal - discountAmount;

  const handleApplyDiscount = () => {
    if (!discountValue || parseFloat(discountValue.replace(/,/g, '')) <= 0) {
      toast.error('Please enter a valid discount value');
      return;
    }

    const cleanValue = discountValue.replace(/,/g, '');
    const value = parseFloat(cleanValue);
    if (discountType === 'percentage' && value > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }

    if (discountType === 'fixed' && value > currentTotal) {
      toast.error('Fixed discount cannot exceed total amount');
      return;
    }

    onApplyDiscount(discountType, cleanValue);
    setDiscountValue('');
  };

  const handleClose = () => {
    setDiscountValue('');
    onClose();
  };

  // Keyboard input handlers
  const handleKeyPress = (key: string) => {
    if (key === '.') {
      // Only allow one decimal point
      if (!discountValue.includes('.')) {
        setDiscountValue(prev => prev + key);
      }
    } else if (key === '00') {
      setDiscountValue(prev => prev + '00');
    } else if (key === '000') {
      setDiscountValue(prev => prev + '000');
    } else {
      setDiscountValue(prev => prev + key);
    }
  };

  const handleBackspace = () => {
    setDiscountValue(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setDiscountValue('');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      // Handle number keys
      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault();
        handleKeyPress(event.key);
      }
      
      // Handle decimal point
      if (event.key === '.') {
        event.preventDefault();
        handleKeyPress('.');
      }
      
      // Handle backspace
      if (event.key === 'Backspace') {
        event.preventDefault();
        handleBackspace();
      }
      
      // Handle Enter to apply discount
      if (event.key === 'Enter') {
        event.preventDefault();
        handleApplyDiscount();
      }
      
      // Handle Escape to close
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, discountValue, discountType]);

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Additional scroll prevention for html element
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling on html element as well
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4" 
      style={{ 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        overflow: 'hidden',
        overscrollBehavior: 'none'
      }}
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl w-full max-w-[95vw] sm:max-w-md shadow-2xl overflow-hidden relative max-h-[95vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-10"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Header with Icon */}
          <div className="p-6 sm:p-8 text-center transition-all duration-500 bg-gradient-to-br from-orange-50 to-amber-50">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg transition-all duration-500 bg-orange-600">
              <Tag className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Apply Discount</h3>
          </div>

        {/* Preview - Moved to Top */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-5">
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm font-medium text-gray-600">Current Total</span>
                <span className="text-base sm:text-lg font-bold text-gray-900">{formatMoney(currentTotal)}</span>
              </div>
              {discountValue && parseFloat(discountValue.replace(/,/g, '')) > 0 && (
                <>
                  <div className="flex justify-between items-center py-2 px-2 sm:px-3 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-xs sm:text-sm font-semibold text-orange-600 flex items-center gap-1 sm:gap-2">
                      <Tag className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="truncate">Discount {discountType === 'percentage' ? `(${formatNumberWithCommas(discountValue)}%)` : ''}</span>
                    </span>
                    <span className="text-base sm:text-lg font-bold text-orange-600 whitespace-nowrap ml-2">-{formatMoney(discountAmount)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 sm:pt-3 mt-2">
                    <div className="flex justify-between items-center bg-green-50 py-2 sm:py-3 px-3 sm:px-4 rounded-lg border border-green-300">
                      <span className="text-sm sm:text-base font-bold text-gray-900">New Total</span>
                      <span className="text-xl sm:text-2xl font-bold text-green-700">{formatMoney(finalTotal)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Discount Type Selection */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
            <button
              onClick={() => {
                setDiscountType('fixed');
                setDiscountValue('');
              }}
              className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                discountType === 'fixed'
                  ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" />
              <div className="text-xs sm:text-sm font-semibold">Fixed</div>
              <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">TZS Amount</div>
            </button>
            <button
              onClick={() => {
                setDiscountType('percentage');
                setDiscountValue('');
              }}
              className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                discountType === 'percentage'
                  ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <Percent className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" />
              <div className="text-xs sm:text-sm font-semibold">Percentage</div>
              <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">% Off</div>
            </button>
          </div>
        </div>

        {/* Input Display */}
        <div className="px-4 sm:px-6 pb-3 sm:pb-4">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 sm:p-6 border-2 border-gray-200 text-center">
            <div className="text-[10px] sm:text-xs font-medium text-gray-500 mb-1 sm:mb-2 uppercase tracking-wide">
              {discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 min-h-[36px] sm:min-h-[48px] flex items-center justify-center">
              {formatNumberWithCommas(discountValue) || '0'}
              <span className="text-lg sm:text-xl md:text-2xl text-gray-500 ml-2">
                {discountType === 'percentage' ? '%' : 'TZS'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Percentage Buttons */}
        {discountType === 'percentage' && (
          <div className="px-4 sm:px-6 pb-3 sm:pb-4">
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {[5, 10, 15, 20].map((percent) => (
                <button
                  key={percent}
                  onClick={() => setDiscountValue(percent.toString())}
                  className="py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm font-semibold bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-700 rounded-lg border border-gray-200 hover:border-orange-300 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {percent}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Number Pad */}
        <div className="px-4 sm:px-6 pb-3 sm:pb-4">
          <div className="bg-white rounded-xl p-2 sm:p-3 border border-gray-200">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleKeyPress(num.toString())}
                  className="aspect-square flex items-center justify-center rounded-lg font-semibold text-lg sm:text-xl transition-all duration-200 bg-gray-50 text-gray-900 hover:bg-orange-100 hover:text-orange-700 active:bg-orange-200 border border-gray-200 hover:border-orange-300 cursor-pointer shadow-sm hover:shadow-md active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="aspect-square flex items-center justify-center rounded-lg font-semibold text-lg sm:text-xl transition-all duration-200 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200 border border-red-200 cursor-pointer shadow-sm hover:shadow-md active:scale-95"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={() => handleKeyPress('0')}
                className="aspect-square flex items-center justify-center rounded-lg font-semibold text-lg sm:text-xl transition-all duration-200 bg-gray-50 text-gray-900 hover:bg-orange-100 hover:text-orange-700 active:bg-orange-200 border border-gray-200 hover:border-orange-300 cursor-pointer shadow-sm hover:shadow-md active:scale-95"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="aspect-square flex items-center justify-center rounded-lg font-semibold text-lg sm:text-xl transition-all duration-200 bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 border border-gray-200 cursor-pointer shadow-sm hover:shadow-md active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Add bottom padding to prevent content from being hidden behind fixed buttons */}
        <div className="h-4"></div>
        </div>

        {/* Fixed Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 rounded-b-2xl shadow-lg">
          <button
            onClick={handleApplyDiscount}
            disabled={!discountValue || parseFloat(discountValue.replace(/,/g, '')) <= 0}
            className="w-full px-4 sm:px-6 py-2.5 sm:py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
          >
            {hasExistingDiscount ? 'Update Discount' : 'Confirm & Apply'}
          </button>
          {hasExistingDiscount && (
            <button
              onClick={() => {
                onClearDiscount();
                handleClose();
              }}
              className="w-full mt-2 sm:mt-3 px-4 sm:px-6 py-2 sm:py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl transition-all font-medium border border-red-200 text-sm sm:text-base"
            >
              Clear Discount
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default POSDiscountModal;
