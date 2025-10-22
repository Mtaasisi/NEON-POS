import React, { useState, useEffect } from 'react';
import { Calculator, X } from 'lucide-react';

interface CBMCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CBMCalculatorModal: React.FC<CBMCalculatorModalProps> = ({ isOpen, onClose }) => {
  // CBM Calculator state
  const [cbmLength, setCbmLength] = useState('');
  const [cbmWidth, setCbmWidth] = useState('');
  const [cbmHeight, setCbmHeight] = useState('');
  const [cbmQuantity, setCbmQuantity] = useState('1');
  const [cbmResult, setCbmResult] = useState(0);
  const [cbmPricePerUnit, setCbmPricePerUnit] = useState('');
  const [cbmTotalPrice, setCbmTotalPrice] = useState(0);
  const [cbmUnit, setCbmUnit] = useState<'m' | 'cm' | 'mm'>('cm');

  // Auto-calculate CBM whenever inputs change
  useEffect(() => {
    const l = parseFloat(cbmLength) || 0;
    const w = parseFloat(cbmWidth) || 0;
    const h = parseFloat(cbmHeight) || 0;
    const q = parseFloat(cbmQuantity) || 1;
    const price = parseFloat(cbmPricePerUnit) || 0;
    
    // Formula depends on unit:
    // m: (L × W × H × Q) = CBM (already in cubic meters)
    // cm: (L × W × H × Q) / 1,000,000 = CBM
    // mm: (L × W × H × Q) / 1,000,000,000 = CBM
    let divisor = 1;
    if (cbmUnit === 'cm') {
      divisor = 1000000;
    } else if (cbmUnit === 'mm') {
      divisor = 1000000000;
    }
    const result = (l * w * h * q) / divisor;
    setCbmResult(result);
    
    // Calculate total price
    const totalPrice = result * price;
    setCbmTotalPrice(totalPrice);
  }, [cbmLength, cbmWidth, cbmHeight, cbmQuantity, cbmPricePerUnit, cbmUnit]);

  const clearCbmCalculator = () => {
    setCbmLength('');
    setCbmWidth('');
    setCbmHeight('');
    setCbmQuantity('1');
    setCbmResult(0);
    setCbmPricePerUnit('');
    setCbmTotalPrice(0);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - respects sidebar and topbar */}
      <div 
        className="fixed bg-black/50"
        onClick={onClose}
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 35
        }}
      />
      
      {/* Modal Container */}
      <div 
        className="fixed flex items-center justify-center p-4"
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 50,
          pointerEvents: 'none'
        }}
      >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calculator className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">CBM Calculator</h3>
                <p className="text-xs text-gray-500">Calculate Cubic Meter for shipping</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Unit Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Measurement Unit
            </label>
            <div className="flex rounded-lg bg-gray-100 p-1 gap-1">
              <button
                type="button"
                onClick={() => setCbmUnit('m')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  cbmUnit === 'm'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Meters (m)
              </button>
              <button
                type="button"
                onClick={() => setCbmUnit('cm')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  cbmUnit === 'cm'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Centimeters (cm)
              </button>
              <button
                type="button"
                onClick={() => setCbmUnit('mm')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  cbmUnit === 'mm'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Millimeters (mm)
              </button>
            </div>
          </div>

          {/* Calculator Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Length ({cbmUnit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cbmLength}
                  onChange={(e) => setCbmLength(e.target.value)}
                  placeholder="Length"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Width ({cbmUnit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cbmWidth}
                  onChange={(e) => setCbmWidth(e.target.value)}
                  placeholder="Width"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height ({cbmUnit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cbmHeight}
                  onChange={(e) => setCbmHeight(e.target.value)}
                  placeholder="Height"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={cbmQuantity}
                  onChange={(e) => setCbmQuantity(e.target.value)}
                  placeholder="Quantity"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price per CBM ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cbmPricePerUnit}
                  onChange={(e) => setCbmPricePerUnit(e.target.value)}
                  placeholder="Price per CBM"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors text-gray-900"
                />
              </div>
            </div>

            {/* Result Display */}
            <div className="bg-green-50 rounded-lg p-6 mt-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total CBM</p>
                  <p className="text-4xl font-bold text-green-600">
                    {cbmResult.toFixed(4)} m³
                  </p>
                </div>
                {cbmPricePerUnit && cbmResult > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Total Price</p>
                    <p className="text-3xl font-bold text-blue-600">
                      ${cbmTotalPrice.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
              {cbmResult > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {cbmLength} × {cbmWidth} × {cbmHeight} × {cbmQuantity}
                  {cbmUnit === 'm' ? '' : ` ÷ ${cbmUnit === 'cm' ? '1,000,000' : '1,000,000,000'}`}
                  {cbmPricePerUnit && ` × $${cbmPricePerUnit}`}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={clearCbmCalculator}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-center text-gray-500 mt-2">
              Results update automatically as you type
            </p>
          </div>
        </div>
      </div>
        </div>
      </div>
    </>
  );
};

export default CBMCalculatorModal;

