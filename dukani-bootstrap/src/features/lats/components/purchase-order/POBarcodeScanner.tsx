import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Keyboard, CheckCircle, AlertCircle, QrCode } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface POBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  products: any[];
}

const POBarcodeScanner: React.FC<POBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  products
}) => {
  const [inputMode, setInputMode] = useState<'camera' | 'manual'>('manual');
  const [manualInput, setManualInput] = useState('');
  const [scanHistory, setScanHistory] = useState<Array<{ barcode: string; time: Date; found: boolean }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputMode === 'manual') {
      inputRef.current?.focus();
    }
  }, [isOpen, inputMode]);

  // Handle keyboard input for barcode scanner (continuous scanning mode)
  useEffect(() => {
    if (!isOpen || inputMode !== 'manual') return;

    let buffer = '';
    let bufferTimeout: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in other inputs
      if (e.target !== inputRef.current && (e.target as HTMLElement).tagName === 'INPUT') {
        return;
      }

      clearTimeout(bufferTimeout);

      if (e.key === 'Enter' && buffer.length > 0) {
        // Process barcode
        handleManualScan(buffer);
        buffer = '';
      } else if (e.key.length === 1) {
        // Add character to buffer
        buffer += e.key;
        
        // Auto-submit after 100ms of no input (typical for barcode scanners)
        bufferTimeout = setTimeout(() => {
          if (buffer.length >= 8) {
            handleManualScan(buffer);
            buffer = '';
          } else {
            buffer = '';
          }
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(bufferTimeout);
    };
  }, [isOpen, inputMode, products]);

  const handleManualScan = async (barcode: string) => {
    if (!barcode || barcode.trim() === '') return;

    setIsProcessing(true);
    const trimmedBarcode = barcode.trim();

    try {
      // Search for product by SKU or barcode
      const foundProduct = products.find(p => {
        // Check if any variant has matching SKU
        if (p.variants && p.variants.length > 0) {
          return p.variants.some((v: any) => 
            v.sku === trimmedBarcode || 
            v.barcode === trimmedBarcode
          );
        }
        return false;
      });

      const scanResult = {
        barcode: trimmedBarcode,
        time: new Date(),
        found: !!foundProduct
      };

      setScanHistory(prev => [scanResult, ...prev.slice(0, 9)]);

      if (foundProduct) {
        toast.success(`Found: ${foundProduct.name}`);
        onScanSuccess(trimmedBarcode);
        setManualInput('');
      } else {
        toast.error(`Product not found for barcode: ${trimmedBarcode}`);
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      toast.error('Failed to process barcode');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleManualScan(manualInput);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <QrCode className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Barcode Scanner</h2>
                <p className="text-green-100 text-sm">Scan products to add to purchase order</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setInputMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                inputMode === 'manual'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Keyboard className="w-5 h-5" />
              Manual / Scanner Input
            </button>
            <button
              onClick={() => {
                toast('Camera scanning: Use manual input with USB barcode scanner', { icon: '📸' });
              }}
              disabled
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60"
              title="Camera scanning not available - use manual input with USB scanner"
            >
              <Camera className="w-5 h-5" />
              Camera Scanner
            </button>
          </div>
        </div>

        {/* Scanner Content */}
        <div className="p-6">
          {inputMode === 'manual' ? (
            <div className="space-y-6">
              {/* Manual Input */}
              <form onSubmit={handleManualSubmit}>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 mb-2 block">
                      Enter or Scan Barcode / SKU
                    </span>
                    <div className="relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="Scan barcode or type SKU..."
                        className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/20 outline-none transition-all"
                        disabled={isProcessing}
                      />
                      {isProcessing && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </label>
                  <button
                    type="submit"
                    disabled={!manualInput.trim() || isProcessing}
                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {isProcessing ? 'Processing...' : 'Find Product'}
                  </button>
                </div>
              </form>

              {/* Instructions */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  How to Use
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>USB Scanner:</strong> Just scan - it will auto-submit</li>
                  <li>• <strong>Manual Entry:</strong> Type SKU and press Enter or click Find</li>
                  <li>• <strong>Quick Scan:</strong> Keep this window open for continuous scanning</li>
                </ul>
              </div>

              {/* Scan History */}
              {scanHistory.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Recent Scans ({scanHistory.length})
                  </h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {scanHistory.map((scan, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-2 flex items-center justify-between ${
                          scan.found
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {scan.found ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          )}
                          <div>
                            <p className="font-mono font-semibold text-gray-900">{scan.barcode}</p>
                            <p className="text-xs text-gray-600">
                              {scan.time.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          scan.found ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {scan.found ? 'Found' : 'Not Found'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Press <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-semibold">Ctrl+B</kbd> to toggle scanner
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Close Scanner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POBarcodeScanner;

